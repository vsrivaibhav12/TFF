import { createClient } from '@/lib/supabase/server';

const BATCH_SIZE = 100;

export async function getComplianceStatusForClients(clientIds: string[]) {
  if (clientIds.length === 0) return {};
  const sb = createClient();
  const result: Record<string, { gst: string; tds: string; it: string }> = {};

  // Batch to avoid HeadersOverflowError on large IN clauses
  for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
    const batch = clientIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await sb
      .from('compliance_status')
      .select('client_id, filing_type, status')
      .in('client_id', batch)
      .order('updated_at', { ascending: false });
    if (error) throw error;

    for (const row of (data ?? []) as any[]) {
      if (!result[row.client_id]) {
        result[row.client_id] = { gst: 'unknown', tds: 'unknown', it: 'unknown' };
      }
      const type = row.filing_type?.toLowerCase();
      if (type === 'gst') result[row.client_id].gst = row.status;
      if (type === 'tds') result[row.client_id].tds = row.status;
      if (type === 'it') result[row.client_id].it = row.status;
    }
  }
  return result;
}

export async function listAllUpcomingDueDates(days: number) {
  const sb = createClient();
  const { todayIST } = await import('@/lib/utils');
  const from = todayIST();
  const to = new Date();
  to.setDate(to.getDate() + days);
  const toStr = to.toISOString().split('T')[0];

  const { data, error } = await sb
    .from('compliance_calendar_events')
    .select('due_date, status, period_label, clients!compliance_calendar_events_client_id_fkey(business_name), compliance_calendar_rules!compliance_calendar_events_rule_id_fkey(display_name, service_kind)')
    .gte('due_date', from)
    .lte('due_date', toStr)
    .order('due_date');
  if (error) throw error;

  const result = { gst: [] as any[], tds: [] as any[], it: [] as any[] };
  for (const row of (data ?? []) as any[]) {
    const kind = row.compliance_calendar_rules?.service_kind?.toLowerCase();
    const item = {
      due_date: row.due_date,
      status: row.status,
      period_label: row.period_label,
      clients: { business_name: row.clients?.business_name ?? '' },
      display_name: row.compliance_calendar_rules?.display_name ?? '',
    };
    if (kind === 'gst') result.gst.push(item);
    else if (kind === 'tds') result.tds.push(item);
    else if (kind === 'it') result.it.push(item);
  }
  return result;
}

export async function listGstFilings(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb.from('gst_filings').select('*').eq('client_id', clientId).order('period_year', { ascending: false }).order('period_month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listGstFilingsForClients(clientIds: string[]) {
  if (clientIds.length === 0) return [];
  const sb = createClient();
  const result: any[] = [];
  for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
    const batch = clientIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await sb
      .from('gst_filings')
      .select('*')
      .in('client_id', batch)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });
    if (error) throw error;
    result.push(...(data ?? []));
  }
  return result;
}

export async function listTdsFilings(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb.from('tds_filings').select('*').eq('client_id', clientId).order('period_year', { ascending: false }).order('period_quarter', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listItFilings(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb.from('it_filings').select('*').eq('client_id', clientId).order('fy_ending_year', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
