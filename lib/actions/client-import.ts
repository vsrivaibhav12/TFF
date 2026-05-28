'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { parseClientsBuffer, type ParsedClientRow } from '@/lib/services/client-import-service';
import { parseGstnPasteText } from '@/lib/services/gstn-paste-service';

export interface ImportPreview {
  rows: ParsedClientRow[];
  summary: { total: number; ready: number; error: number };
  fileName: string;
  source?: 'file' | 'gstn_paste';
}

export interface ImportErrorEntry {
  row_index: number;
  business_name: string;
  error: string;
}

/**
 * Parse the uploaded file (CSV or XLSX) on the server and return a preview.
 * No DB writes happen on preview — only validation.
 */
export async function previewClientImportAction(formData: FormData): Promise<ActionResult<ImportPreview>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'clients.create');
    const file = formData.get('file');
    if (!(file instanceof File)) return fail('No file provided', 'VALIDATION');
    if (file.size === 0) return fail('Empty file', 'VALIDATION');
    if (file.size > 5 * 1024 * 1024) return fail('File exceeds 5 MB limit', 'VALIDATION');

    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);
    const rows = parseClientsBuffer(buf, file.name);
    if (rows.length === 0) return fail('No data rows found in the file', 'EMPTY');

    const summary = {
      total: rows.length,
      error: rows.filter((r) => r.errors.length > 0).length,
      ready: rows.length - rows.filter((r) => r.errors.length > 0).length,
    };
    return ok({ rows, summary, fileName: file.name, source: 'file' });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

/**
 * Preview a multiline-paste of GSTINs (no paid API; pure regex + state-code lookup).
 * Each line becomes a row pre-filled with GSTIN, derived PAN (positions 3-12), and
 * state name. Caller fills in business_name and contact details inline before commit.
 */
export async function previewGstnPasteAction(input: {
  text: string;
}): Promise<ActionResult<ImportPreview>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'clients.create');
    if (!input?.text || typeof input.text !== 'string') return fail('No GSTINs provided', 'VALIDATION');
    const rows = parseGstnPasteText(input.text);
    if (rows.length === 0) return fail('No GSTINs found in input', 'EMPTY');
    if (rows.length > 200) return fail('Maximum 200 GSTINs per paste — split into smaller batches', 'VALIDATION');

    // Flag each row that lacks a business_name (it's required to commit).
    for (const r of rows) {
      if (!r.business_name) r.errors.push('Business name required — fill in before importing');
    }
    const summary = {
      total: rows.length,
      error: rows.filter((r) => r.errors.length > 0).length,
      ready: rows.filter((r) => r.errors.length === 0).length,
    };
    return ok({ rows, summary, fileName: `GSTN paste (${rows.length} rows)`, source: 'gstn_paste' });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

/**
 * Commit the import: insert valid rows into `clients` and write an audit
 * batch record to `client_import_batches`. Supports update-existing mode.
 */
export async function commitClientImportAction(input: {
  file_name: string;
  rows: ParsedClientRow[];
  update_existing?: boolean;
}): Promise<ActionResult<{
  batch_id: string;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: ImportErrorEntry[];
}>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'clients.create');
    if (!Array.isArray(input.rows) || input.rows.length === 0) {
      return fail('No rows to import', 'VALIDATION');
    }
    const sb = createClient();
    const updateExisting = !!input.update_existing;

    // Pre-load existing PAN/GSTIN → client id for dedup and optional update
    const pans = input.rows.map((r) => r.pan).filter(Boolean) as string[];
    const gstins = input.rows.map((r) => r.gstin).filter(Boolean) as string[];
    const existingPanToId = new Map<string, string>();
    const existingGstinToId = new Map<string, string>();
    const LOOKUP_BATCH = 100;
    for (let i = 0; i < pans.length; i += LOOKUP_BATCH) {
      const batch = pans.slice(i, i + LOOKUP_BATCH);
      const { data } = await sb.from('clients').select('id, pan').in('pan', batch).eq('is_deleted', false);
      (data ?? []).forEach((r: any) => { if (r.pan) existingPanToId.set(r.pan, r.id); });
    }
    for (let i = 0; i < gstins.length; i += LOOKUP_BATCH) {
      const batch = gstins.slice(i, i + LOOKUP_BATCH);
      const { data } = await sb.from('clients').select('id, gstin').in('gstin', batch).eq('is_deleted', false);
      (data ?? []).forEach((r: any) => { if (r.gstin) existingGstinToId.set(r.gstin, r.id); });
    }

    // --- Group auto-create / lookup ---
    const groupNames = Array.from(new Set(input.rows.map((r) => r.group).filter(Boolean) as string[]));
    const groupNameToId = new Map<string, string>();
    if (groupNames.length > 0) {
      const { data: existingGroups } = await sb
        .from('client_groups')
        .select('id, name')
        .in('name', groupNames)
        .eq('is_deleted', false);
      (existingGroups ?? []).forEach((g: any) => groupNameToId.set(g.name, g.id));

      const missingNames = groupNames.filter((n) => !groupNameToId.has(n));
      for (const name of missingNames) {
        const { data: newGroup, error: groupErr } = await sb
          .from('client_groups')
          .insert({ name })
          .select('id')
          .single();
        if (groupErr) {
          console.warn('Failed to auto-create group:', name, groupErr.message);
        } else if (newGroup) {
          groupNameToId.set(name, newGroup.id);
        }
      }
    }

    // Track intra-file duplicates for clear messaging
    const seenPans = new Set<string>();
    const seenGstins = new Set<string>();

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: ImportErrorEntry[] = [];

    type ClientPayload = {
      business_name: string;
      pan: string | null;
      gstin: string | null;
      category: string | null;
      industry: string | null;
      primary_contact_person: string | null;
      primary_contact_email: string | null;
      primary_contact_phone: string | null;
      city: string | null;
      state: string | null;
      pincode: string | null;
      group_id: string | null;
    };

    function buildPayload(r: ParsedClientRow): ClientPayload {
      return {
        business_name: r.business_name,
        pan: r.pan ?? null,
        gstin: r.gstin ?? null,
        category: r.category ?? null,
        industry: r.industry ?? null,
        primary_contact_person: r.primary_contact_person ?? null,
        primary_contact_email: r.primary_contact_email ?? null,
        primary_contact_phone: r.primary_contact_phone ?? null,
        city: r.city ?? null,
        state: r.state ?? null,
        pincode: r.pincode ?? null,
        group_id: r.group ? (groupNameToId.get(r.group) ?? null) : null,
      };
    }

    for (const r of input.rows) {
      if (r.errors.length > 0) {
        failed++;
        errors.push({
          row_index: r.row_index,
          business_name: r.business_name || '(no name)',
          error: r.errors.join('; '),
        });
        continue;
      }

      const dupPanId = r.pan ? existingPanToId.get(r.pan) : undefined;
      const dupGstinId = r.gstin ? existingGstinToId.get(r.gstin) : undefined;
      const existingId = dupPanId || dupGstinId;

      if (existingId && updateExisting) {
        const { error } = await sb.from('clients').update(buildPayload(r)).eq('id', existingId);
        if (error) {
          failed++;
          errors.push({ row_index: r.row_index, business_name: r.business_name, error: error.message });
        } else {
          updated++;
        }
        continue;
      }

      if (r.pan && seenPans.has(r.pan)) {
        skipped++;
        errors.push({ row_index: r.row_index, business_name: r.business_name, error: `Duplicate PAN ${r.pan} in file` });
        continue;
      }
      if (r.gstin && seenGstins.has(r.gstin)) {
        skipped++;
        errors.push({ row_index: r.row_index, business_name: r.business_name, error: `Duplicate GSTIN ${r.gstin} in file` });
        continue;
      }

      if (r.pan && dupPanId) {
        skipped++;
        errors.push({ row_index: r.row_index, business_name: r.business_name, error: `PAN ${r.pan} already exists` });
        continue;
      }
      if (r.gstin && dupGstinId) {
        skipped++;
        errors.push({ row_index: r.row_index, business_name: r.business_name, error: `GSTIN ${r.gstin} already exists` });
        continue;
      }

      const { error } = await sb.from('clients').insert(buildPayload(r));
      if (error) {
        failed++;
        errors.push({ row_index: r.row_index, business_name: r.business_name, error: error.message });
      } else {
        inserted++;
        if (r.pan) seenPans.add(r.pan);
        if (r.gstin) seenGstins.add(r.gstin);
      }
    }

    const { data: batch, error: batchErr } = await sb
      .from('client_import_batches')
      .insert({
        uploaded_by: me.id,
        source_filename: input.file_name,
        total_rows: input.rows.length,
        successful_rows: inserted + updated,
        skipped_rows: skipped,
        error_rows: failed,
        errors,
        status: 'completed',
      })
      .select('id')
      .single();
    if (batchErr) return fail(`Batch audit failed: ${batchErr.message}`, 'DB');

    revalidatePath('/admin/clients');
    revalidatePath('/admin/clients/import');
    return ok({ batch_id: batch.id, inserted, updated, skipped, failed, errors });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
