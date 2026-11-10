import { createClient } from '@/lib/supabase/server';

const BATCH_SIZE = 100;

export async function countActiveEngagementsForClients(clientIds: string[]): Promise<Record<string, number>> {
  if (clientIds.length === 0) return {};
  const sb = createClient();
  const counts: Record<string, number> = {};

  for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
    const batch = clientIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await sb
      .from('client_sub_services')
      .select('client_id')
      .in('client_id', batch)
      .eq('is_active', true);
    if (error) throw error;
    for (const row of (data ?? []) as any[]) {
      counts[row.client_id] = (counts[row.client_id] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Make sure a client has an active link to a sub-service. Creates the link, or
 * re-activates one that was switched off. Safe to call repeatedly (the table has
 * a unique (client_id, sub_service_id) constraint).
 */
export async function ensureClientSubServiceLink(clientId: string, subServiceId: string): Promise<void> {
  const sb = createClient();
  const { data: existing, error: findErr } = await sb
    .from('client_sub_services')
    .select('id, is_active')
    .eq('client_id', clientId)
    .eq('sub_service_id', subServiceId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) {
    if (existing.is_active === false) {
      const { error } = await sb.from('client_sub_services').update({ is_active: true }).eq('id', existing.id);
      if (error) throw error;
    }
    return;
  }
  const { error } = await sb
    .from('client_sub_services')
    .insert({ client_id: clientId, sub_service_id: subServiceId, is_active: true });
  // 23505 = a concurrent request already created the link; that is the outcome we want.
  if (error && error.code !== '23505') throw error;
}

export { listClientSubServices } from '@/lib/repositories/services';
