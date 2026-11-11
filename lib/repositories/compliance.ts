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

    for (const row of (data ?? []) as Array<{ client_id: string; filing_type: string; status: string }>) {
      if (!result[row.client_id]) {
        result[row.client_id] = { gst: 'unknown', tds: 'unknown', it: 'unknown' };
      }
      const type = row.filing_type?.toLowerCase();
      // Rows arrive newest first, so the first one seen for a filing type is the current status.
      const entry = result[row.client_id];
      if (type === 'gst' && entry.gst === 'unknown') entry.gst = row.status;
      if (type === 'tds' && entry.tds === 'unknown') entry.tds = row.status;
      if (type === 'it' && entry.it === 'unknown') entry.it = row.status;
    }
  }
  return result;
}

export async function listAllUpcomingDueDates(
  days: number,
  clientIds?: string[]
) {
  const sb = createClient();
  const { todayIST } = await import('@/lib/utils');
  const from = todayIST();
  const to = new Date();
  to.setDate(to.getDate() + days);
  const toStr = to.toISOString().split('T')[0];

  let query = sb
    .from('compliance_calendar_events')
    .select('due_date, status, period_label, clients!compliance_calendar_events_client_id_fkey(business_name), compliance_calendar_rules!compliance_calendar_events_rule_id_fkey(display_name, service_kind)')
    .gte('due_date', from)
    .lte('due_date', toStr);
  if (clientIds && clientIds.length > 0) query = query.in('client_id', clientIds.slice(0, BATCH_SIZE));
  const { data, error } = await query.order('due_date');
  if (error) throw error;

  type DueItem = { due_date: string; status: string; period_label: string; clients: { business_name: string }; display_name: string };
  const result = { gst: [] as DueItem[], tds: [] as DueItem[], it: [] as DueItem[] };
  for (const row of (data ?? []) as Array<any>) {
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
