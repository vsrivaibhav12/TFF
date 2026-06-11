import { createClient } from '@/lib/supabase/server';

const BATCH_SIZE = 100;

export interface GstFilingRow {
  id: string; client_id: string; period_month: number; period_year: number;
  return_type: string; status: string; filed_date: string | null;
  ack_number: string | null; taxable_turnover: number | null;
  output_cgst: number | null; output_sgst: number | null;
  output_igst: number | null; output_cess: number | null;
}

export interface TdsFilingRow {
  id: string; client_id: string; period_quarter: number; period_year: number;
  status: string; filed_date: string | null;
  ack_number: string | null; total_deductions: number | null; deductee_count: number | null;
}

export interface ItFilingRow {
  id: string; client_id: string; fy_ending_year: number;
  status: string; filed_date: string | null;
  ack_number: string | null; gross_income: number | null;
  deductions_claimed: number | null; taxable_income: number | null; tax_liability: number | null;
}

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

export async function listGstFilings(clientId: string): Promise<GstFilingRow[]> {
  const sb = createClient();
  const { data, error } = await sb.from('gst_filings').select('id, client_id, period_month, period_year, return_type, status, filed_date, ack_number, taxable_turnover, output_cgst, output_sgst, output_igst, output_cess').eq('client_id', clientId).order('period_year', { ascending: false }).order('period_month', { ascending: false });
  if (error) throw error;
  return (data ?? []) as GstFilingRow[];
}

export async function listGstFilingsForClients(clientIds: string[]) {
  if (clientIds.length === 0) return [];
  const sb = createClient();
  const result: any[] = [];
  for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
    const batch = clientIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await sb
      .from('gst_filings')
      .select('id, client_id, period_month, period_year, return_type, status, filed_date, ack_number, taxable_turnover, output_cgst, output_sgst, output_igst, output_cess')
      .in('client_id', batch)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });
    if (error) throw error;
    result.push(...(data ?? []));
  }
  return result;
}

export async function listTdsFilings(clientId: string): Promise<TdsFilingRow[]> {
  const sb = createClient();
  const { data, error } = await sb.from('tds_filings').select('id, client_id, period_quarter, period_year, status, filed_date, ack_number, total_deductions, deductee_count').eq('client_id', clientId).order('period_year', { ascending: false }).order('period_quarter', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TdsFilingRow[];
}

export async function listItFilings(clientId: string): Promise<ItFilingRow[]> {
  const sb = createClient();
  const { data, error } = await sb.from('it_filings').select('id, client_id, fy_ending_year, status, filed_date, ack_number, gross_income, deductions_claimed, taxable_income, tax_liability').eq('client_id', clientId).order('fy_ending_year', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ItFilingRow[];
}
