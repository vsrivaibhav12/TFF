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
 * batch record to `client_import_batches` (per v3.2 spec). Insert-only;
 * skips duplicates by PAN/GSTIN if those already exist.
 */
export async function commitClientImportAction(input: {
  file_name: string;
  rows: ParsedClientRow[];
}): Promise<ActionResult<{ batch_id: string; inserted: number; skipped: number; failed: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'clients.create');
    if (!Array.isArray(input.rows) || input.rows.length === 0) {
      return fail('No rows to import', 'VALIDATION');
    }
    const sb = createClient();

    // Pre-load existing PAN/GSTIN to skip duplicates server-side
    const pans = input.rows.map((r) => r.pan).filter(Boolean) as string[];
    const gstins = input.rows.map((r) => r.gstin).filter(Boolean) as string[];
    const existingPans = new Set<string>();
    const existingGstins = new Set<string>();
    const LOOKUP_BATCH = 100;
    for (let i = 0; i < pans.length; i += LOOKUP_BATCH) {
      const batch = pans.slice(i, i + LOOKUP_BATCH);
      const { data } = await sb.from('clients').select('pan').in('pan', batch);
      (data ?? []).forEach((r: any) => r.pan && existingPans.add(r.pan));
    }
    for (let i = 0; i < gstins.length; i += LOOKUP_BATCH) {
      const batch = gstins.slice(i, i + LOOKUP_BATCH);
      const { data } = await sb.from('clients').select('gstin').in('gstin', batch);
      (data ?? []).forEach((r: any) => r.gstin && existingGstins.add(r.gstin));
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

    // Build insert-ready rows, skipping duplicates and pre-validation failures
    type InsertRow = {
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
      _row_index: number;
      _business_name: string;
    };

    const toInsert: InsertRow[] = [];
    let skipped = 0;
    let preFailed = 0;
    const errorEntries: Array<{ row_index: number; business_name: string; error: string }> = [];

    for (const r of input.rows) {
      if (r.errors.length > 0) {
        preFailed++;
        errorEntries.push({
          row_index: r.row_index,
          business_name: r.business_name || '(no name)',
          error: r.errors.join('; '),
        });
        continue;
      }
      if (r.pan && existingPans.has(r.pan)) {
        skipped++;
        errorEntries.push({
          row_index: r.row_index,
          business_name: r.business_name,
          error: `Duplicate PAN ${r.pan} — skipped`,
        });
        continue;
      }
      if (r.gstin && existingGstins.has(r.gstin)) {
        skipped++;
        errorEntries.push({
          row_index: r.row_index,
          business_name: r.business_name,
          error: `Duplicate GSTIN ${r.gstin} — skipped`,
        });
        continue;
      }
      toInsert.push({
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
        _row_index: r.row_index,
        _business_name: r.business_name,
      });
    }

    // Batch insert for speed; fall back to per-row on batch failure
    let inserted = 0;
    let failed = preFailed;
    const INSERT_BATCH = 100;
    for (let i = 0; i < toInsert.length; i += INSERT_BATCH) {
      const batch = toInsert.slice(i, i + INSERT_BATCH);
      const batchPayload = batch.map(({ _row_index, _business_name, ...rest }) => rest);
      const { error: batchError } = await sb.from('clients').insert(batchPayload);

      if (!batchError) {
        // Whole batch succeeded
        inserted += batch.length;
        batch.forEach((r) => {
          if (r.pan) existingPans.add(r.pan);
          if (r.gstin) existingGstins.add(r.gstin);
        });
        continue;
      }

      // Batch failed — try one-by-one to identify culprits
      for (const r of batch) {
        const { _row_index, _business_name, ...payload } = r;
        const { error } = await sb.from('clients').insert(payload);
        if (error) {
          failed++;
          errorEntries.push({
            row_index: _row_index,
            business_name: _business_name,
            error: error.message,
          });
        } else {
          inserted++;
          if (r.pan) existingPans.add(r.pan);
          if (r.gstin) existingGstins.add(r.gstin);
        }
      }
    }

    const { data: batch, error: batchErr } = await sb
      .from('client_import_batches')
      .insert({
        uploaded_by: me.id,
        source_filename: input.file_name,
        total_rows: input.rows.length,
        successful_rows: inserted,
        skipped_rows: skipped,
        error_rows: failed,
        errors: errorEntries,
        status: 'completed',
      })
      .select('id')
      .single();
    if (batchErr) return fail(`Batch audit failed: ${batchErr.message}`, 'DB');

    revalidatePath('/admin/clients');
    revalidatePath('/admin/clients/import');
    return ok({ batch_id: batch.id, inserted, skipped, failed });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
