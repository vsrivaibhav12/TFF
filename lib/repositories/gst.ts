import { createClient } from '@/lib/supabase/server';

export async function getGstMonthlyDataForClient(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('gst_monthly_data')
    .select('*')
    .eq('client_id', clientId)
    .order('period_year', { ascending: true })
    .order('period_month', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getGstMonthlyDataForClients(clientIds: string[]) {
  if (clientIds.length === 0) return [];
  const sb = createClient();
  const result: any[] = [];
  const BATCH_SIZE = 100;
  for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
    const batch = clientIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await sb
      .from('gst_monthly_data')
      .select('*')
      .in('client_id', batch)
      .order('period_year', { ascending: true })
      .order('period_month', { ascending: true });
    if (error) throw error;
    result.push(...(data ?? []));
  }
  return result;
}

export async function getGstMonthlyDataForAllClients() {
  const sb = createClient();
  const { data, error } = await sb
    .from('gst_monthly_data')
    .select('*, clients!gst_monthly_data_client_id_fkey(business_name)')
    .order('period_year', { ascending: true })
    .order('period_month', { ascending: true })
    .limit(1000);
  if (error) throw error;
  return data ?? [];
}
