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

export { listClientSubServices } from '@/lib/repositories/services';
