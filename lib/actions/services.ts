'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

export async function linkSubServiceAction(input: { client_id: string; sub_service_id: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.assign');
    const sb = createClient();
    const { data: existing } = await sb
      .from('client_sub_services')
      .select('id')
      .eq('client_id', input.client_id)
      .eq('sub_service_id', input.sub_service_id)
      .maybeSingle();
    if (existing) return fail('Already linked', 'DUPLICATE');
    const { error } = await sb.from('client_sub_services').insert({ ...input, is_active: true });
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/admin/clients/${input.client_id}`);
    revalidatePath(`/team/clients/${input.client_id}`);
    revalidatePath(`/admin/services/sub-services/${input.sub_service_id}/clients`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function unlinkSubServiceAction(input: { id: string; client_id: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.assign');
    const sb = createClient();
    const { error } = await sb.from('client_sub_services').delete().eq('id', input.id);
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/admin/clients/${input.client_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function bulkLinkSubServiceAction(input: { client_ids: string[]; sub_service_id: string }): Promise<ActionResult<{ linked: number; skipped: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.assign');
    const sb = createClient();

    // Find existing links to avoid duplicates
    const { data: existing } = await sb
      .from('client_sub_services')
      .select('client_id')
      .in('client_id', input.client_ids)
      .eq('sub_service_id', input.sub_service_id);
    const existingSet = new Set((existing ?? []).map((r: any) => r.client_id));
    const toLink = input.client_ids.filter((id) => !existingSet.has(id));

    if (toLink.length === 0) {
      return ok({ linked: 0, skipped: input.client_ids.length });
    }

    const rows = toLink.map((client_id) => ({
      client_id,
      sub_service_id: input.sub_service_id,
      is_active: true,
    }));

    const { error } = await sb.from('client_sub_services').insert(rows);
    if (error) return fail(error.message, 'DB');

    for (const client_id of toLink) {
      revalidatePath(`/admin/clients/${client_id}`);
      revalidatePath(`/team/clients/${client_id}`);
    }
    revalidatePath('/admin/clients');
    revalidatePath('/team/clients');

    return ok({ linked: toLink.length, skipped: input.client_ids.length - toLink.length });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function linkMultipleSubServicesToClientAction(input: { client_id: string; sub_service_ids: string[] }): Promise<ActionResult<{ linked: number; skipped: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.assign');
    const sb = createClient();

    // Find existing links to avoid duplicates
    const { data: existing } = await sb
      .from('client_sub_services')
      .select('sub_service_id')
      .eq('client_id', input.client_id)
      .in('sub_service_id', input.sub_service_ids);
      
    const existingSet = new Set((existing ?? []).map((r: any) => r.sub_service_id));
    const toLink = input.sub_service_ids.filter((id) => !existingSet.has(id));

    if (toLink.length === 0) {
      return ok({ linked: 0, skipped: input.sub_service_ids.length });
    }

    const rows = toLink.map((sub_service_id) => ({
      client_id: input.client_id,
      sub_service_id,
      is_active: true,
    }));

    const { error } = await sb.from('client_sub_services').insert(rows);
    if (error) return fail(error.message, 'DB');

    revalidatePath(`/admin/clients/${input.client_id}`);
    revalidatePath(`/team/clients/${input.client_id}`);
    revalidatePath('/admin/services/sub-services');

    return ok({ linked: toLink.length, skipped: input.sub_service_ids.length - toLink.length });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function linkServiceToClientAction(input: { client_id: string; service_id: string; access_level?: 'full' | 'limited' | 'view_only'; service_head_id?: string | null }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.assign');
    const sb = createClient();
    const { data: existing } = await sb
      .from('client_services')
      .select('id')
      .eq('client_id', input.client_id)
      .eq('service_id', input.service_id)
      .maybeSingle();
    if (existing) return fail('Already linked', 'DUPLICATE');
    const { error } = await sb.from('client_services').insert({
      client_id: input.client_id,
      service_id: input.service_id,
      access_level: input.access_level ?? 'limited',
      service_head_id: input.service_head_id ?? null,
      start_date: (await import('@/lib/utils')).todayIST(),
      is_active: true,
    });
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/admin/clients/${input.client_id}`);
    revalidatePath(`/team/clients/${input.client_id}`);
    revalidatePath('/portal');
    revalidatePath('/portal');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function updateClientServiceHeadAction(input: { id: string; client_id: string; service_head_id?: string | null }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.assign');
    const sb = createClient();
    const { error } = await sb.from('client_services').update({ service_head_id: input.service_head_id ?? null, updated_at: new Date().toISOString() }).eq('id', input.id);
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/admin/clients/${input.client_id}`);
    revalidatePath(`/team/clients/${input.client_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
