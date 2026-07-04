'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

const ALLOWED_DSC_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/pkcs12',
  'application/x-pkcs12',
  'application/octet-stream',
];
const MAX_SIZE = 5 * 1024 * 1024;

export async function uploadDscCertificateAction(
  dscId: string,
  file: File,
): Promise<ActionResult<{ path: string; name: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'dsc.manage');

    if (!(file instanceof File)) return fail('No file provided', 'VALIDATION');
    if (file.size === 0) return fail('Empty file', 'VALIDATION');
    if (file.size > MAX_SIZE) return fail('File exceeds 5 MB limit', 'VALIDATION');
    if (!ALLOWED_DSC_TYPES.includes(file.type)) {
      return fail('Only PDF, PNG, JPG or PFX certificate files are allowed', 'VALIDATION');
    }

    const sb = createClient();

    // Verify the DSC record exists and is accessible
    const { data: record, error: recordErr } = await sb
      .from('dsc_records')
      .select('id')
      .eq('id', dscId)
      .eq('is_deleted', false)
      .maybeSingle();
    if (recordErr || !record) return fail('DSC record not found', 'NOT_FOUND');

    const ext = file.name.split('.').pop() ?? 'pdf';
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const path = `${dscId}/${safeName}`;

    // Use service-role for storage: storage RLS policies cannot be created
    // programmatically on hosted Supabase, and capability gating is the
    // application-level access control for this staff-only bucket.
    const storage = createServiceClient().storage;
    const { error: uploadErr } = await storage
      .from('dsc-files')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) return fail(`Upload failed: ${uploadErr.message}`, 'STORAGE_ERROR');

    const { error: updateErr } = await sb
      .from('dsc_records')
      .update({ certificate_file_path: path, certificate_file_name: file.name })
      .eq('id', dscId);

    if (updateErr) return fail(`Record update failed: ${updateErr.message}`, 'DB_ERROR');

    return ok({ path, name: file.name });
  } catch (e: any) {
    return fail(e?.message ?? 'Upload failed', e?.code ?? 'UNKNOWN');
  }
}

export async function getDscCertificateUrlAction(
  dscId: string,
): Promise<ActionResult<{ url: string; name: string | null }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'dsc.view');

    const sb = createClient();
    const { data: record } = await sb
      .from('dsc_records')
      .select('certificate_file_path, certificate_file_name')
      .eq('id', dscId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (!record?.certificate_file_path) return fail('No certificate file on record', 'NOT_FOUND');

    const storage = createServiceClient().storage;
    const { data, error } = await storage
      .from('dsc-files')
      .createSignedUrl(record.certificate_file_path, 60 * 60); // 1 hour

    if (error || !data?.signedUrl) return fail('Could not generate download URL', 'STORAGE_ERROR');

    return ok({ url: data.signedUrl, name: record.certificate_file_name });
  } catch (e: any) {
    return fail(e?.message ?? 'Download failed', e?.code ?? 'UNKNOWN');
  }
}
