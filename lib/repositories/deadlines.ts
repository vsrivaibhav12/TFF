import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAll, chunkArray } from '@/lib/supabase/fetch-all';
import type { CalendarRule, ClientProfile } from '@/lib/services/compliance-calendar-engine';
import type { DeadlineSubService } from '@/lib/services/deadline-due-date';
import type { PlanClientInput } from '@/lib/services/deadline-plan';
import type { CreateRowsArgs, CreateRowsResult } from '@/lib/services/deadline-create';

export type SchedulableSubService = DeadlineSubService & {
  period_type: string | null;
  service_name: string | null;
};

const SUB_COLUMNS = 'id, code, name, frequency, period_type, due_day_of_month, due_day_of_quarter, due_month';

export async function getSubServiceForDeadline(sb: SupabaseClient, id: string): Promise<(DeadlineSubService & { period_type: string | null }) | null> {
  const { data, error } = await sb.from('sub_services').select(SUB_COLUMNS).eq('id', id).eq('is_deleted', false).maybeSingle();
  if (error) throw error;
  return (data as (DeadlineSubService & { period_type: string | null }) | null) ?? null;
}

/** Active sub-services that have a period, for the deadline picker. */
export async function listSchedulableSubServices(sb: SupabaseClient): Promise<SchedulableSubService[]> {
  const { data, error } = await sb
    .from('sub_services')
    .select(`${SUB_COLUMNS}, services(name)`)
    .eq('is_deleted', false)
    .eq('is_active', true)
    .neq('period_type', 'none')
    .order('name');
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    service_name: (Array.isArray(r.services) ? r.services[0]?.name : r.services?.name) ?? null,
  }));
}

/** The compliance rule linked to a sub-service. If several are linked, the first active one is used. */
export async function getRuleForSubService(sb: SupabaseClient, subServiceId: string): Promise<CalendarRule | null> {
  const { data, error } = await sb
    .from('compliance_calendar_rules')
    .select('*')
    .eq('sub_service_id', subServiceId)
    .eq('is_active', true)
    .order('rule_code')
    .limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as CalendarRule | undefined) ?? null;
}

export async function getDeadlineOverride(sb: SupabaseClient, subServiceId: string, periodKey: string): Promise<{ due_date: string; original_due_date: string | null; extension_note: string | null } | null> {
  const { data, error } = await sb
    .from('compliance_deadlines')
    .select('due_date, original_due_date, extension_note')
    .eq('sub_service_id', subServiceId)
    .eq('period_key', periodKey)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

type RpcClientRow = {
  client_id: string;
  business_name: string;
  group_name: string | null;
  default_assignee_id: string | null;
  gst_filing_frequency: string | null;
  profile: ClientProfile | null;
  existing_task_id: string | null;
};

/** For people using the app: the database function checks the caller and returns the linked clients. */
export async function listDeadlineClientsRpc(sb: SupabaseClient, subServiceId: string, periodKey: string): Promise<PlanClientInput[]> {
  const { data, error } = await sb.rpc('list_deadline_clients', { p_sub_service_id: subServiceId, p_period_key: periodKey });
  if (error) throw error;
  return ((data ?? []) as unknown as RpcClientRow[]).map((r) => ({
    client_id: r.client_id,
    business_name: r.business_name,
    group_name: r.group_name,
    default_assignee_id: r.default_assignee_id,
    gst_filing_frequency: r.gst_filing_frequency,
    profile: r.profile,
    existing_task_id: r.existing_task_id,
  }));
}

/** For the scheduled job (service role, no signed-in user): the same data by direct queries. */
export async function listDeadlineClientsDirect(sb: SupabaseClient, subServiceId: string, periodKey: string): Promise<PlanClientInput[]> {
  const links = await fetchAll<{ client_id: string; default_assignee_id: string | null }>(() =>
    sb.from('client_sub_services').select('client_id, default_assignee_id').eq('sub_service_id', subServiceId).neq('is_active', false),
  );
  if (links.length === 0) return [];
  const ids = links.map((l) => l.client_id);

  const clients: Array<{ id: string; business_name: string; client_groups: { name: string } | { name: string }[] | null }> = [];
  const profiles = new Map<string, ClientProfile & { gst_filing_frequency?: string | null }>();
  for (const chunk of chunkArray(ids, 150)) {
    const { data: cs, error: ce } = await sb.from('clients').select('id, business_name, client_groups(name)').in('id', chunk).eq('is_deleted', false);
    if (ce) throw ce;
    clients.push(...((cs ?? []) as any[]));
    const { data: ps, error: pe } = await sb.from('client_compliance_profiles').select('*').in('client_id', chunk);
    if (pe) throw pe;
    for (const p of (ps ?? []) as any[]) profiles.set(p.client_id, p);
  }

  const existing = new Map<string, string>();
  const tasks = await fetchAll<{ id: string; client_id: string }>(() =>
    sb.from('tasks').select('id, client_id').eq('sub_service_id', subServiceId).eq('period_key', periodKey).eq('is_deleted', false),
  );
  for (const t of tasks) existing.set(t.client_id, t.id);

  const defaults = new Map(links.map((l) => [l.client_id, l.default_assignee_id]));
  return clients
    .map((c) => {
      const p = profiles.get(c.id) ?? null;
      const group = Array.isArray(c.client_groups) ? c.client_groups[0] : c.client_groups;
      return {
        client_id: c.id,
        business_name: c.business_name,
        group_name: group?.name ?? null,
        default_assignee_id: defaults.get(c.id) ?? null,
        gst_filing_frequency: p?.gst_filing_frequency ?? null,
        profile: p,
        existing_task_id: existing.get(c.id) ?? null,
      };
    })
    .sort((a, b) => a.business_name.localeCompare(b.business_name));
}

/** Creates the tasks through the database function, which checks the caller and each row. */
export async function createDeadlineRowsRpc(sb: SupabaseClient, args: CreateRowsArgs): Promise<CreateRowsResult> {
  const { data, error } = await sb.rpc('create_deadline_tasks', {
    p_sub_service_id: args.sub_service_id,
    p_period_key: args.period_key,
    p_period_type: args.period_type,
    p_period_year: args.period_year,
    p_period_month: args.period_month,
    p_period_quarter: args.period_quarter,
    p_due_date: args.due_date,
    p_priority: args.priority,
    p_rows: args.rows,
  });
  if (error) throw error;
  const out = (data ?? {}) as Partial<CreateRowsResult>;
  return { created: out.created ?? [], failed: out.failed ?? [] };
}

export async function upsertDeadlineOverride(
  sb: SupabaseClient,
  args: { sub_service_id: string; period_key: string; due_date: string; original_due_date: string | null; note: string | null; user_id: string },
): Promise<void> {
  const current = await getDeadlineOverride(sb, args.sub_service_id, args.period_key);
  const { error } = await sb.from('compliance_deadlines').upsert(
    {
      sub_service_id: args.sub_service_id,
      period_key: args.period_key,
      due_date: args.due_date,
      // The first change records the statutory date; later changes keep it.
      original_due_date: current?.original_due_date ?? args.original_due_date,
      extension_note: args.note,
      updated_by: args.user_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'sub_service_id,period_key' },
  );
  if (error) throw error;
}

/** Events of this deadline get the new due date, so the calendar and the dashboards agree. */
export async function setEventDueDates(sb: SupabaseClient, subServiceId: string, periodKey: string, dueDate: string): Promise<void> {
  const { data: rules, error: re } = await sb.from('compliance_calendar_rules').select('id').eq('sub_service_id', subServiceId);
  if (re) throw re;
  const ruleIds = (rules ?? []).map((r: { id: string }) => r.id);
  const filter = ruleIds.length > 0
    ? `sub_service_id.eq.${subServiceId},rule_id.in.(${ruleIds.join(',')})`
    : `sub_service_id.eq.${subServiceId}`;
  const { error } = await sb.from('compliance_calendar_events').update({ due_date: dueDate }).eq('period_key', periodKey).or(filter);
  if (error) throw error;
}

/** Open tasks of a deadline: the ones an extension may move. */
export async function listOpenDeadlineTasks(sb: SupabaseClient, subServiceId: string, periodKey: string): Promise<Array<{ id: string; assigned_to: string | null }>> {
  return fetchAll<{ id: string; assigned_to: string | null }>(() =>
    sb.from('tasks').select('id, assigned_to').eq('sub_service_id', subServiceId).eq('period_key', periodKey).eq('is_deleted', false).in('status', ['pending', 'in_progress']),
  );
}

/** Returns how many tasks were really changed (row level security can allow zero rows without an error). */
export async function setTasksDueDate(sb: SupabaseClient, ids: string[], dueDate: string): Promise<number> {
  let changed = 0;
  for (const chunk of chunkArray(ids, 150)) {
    const { data, error } = await sb.from('tasks').update({ due_date: dueDate, updated_at: new Date().toISOString() }).in('id', chunk).select('id');
    if (error) throw error;
    changed += (data ?? []).length;
  }
  return changed;
}

export async function setDefaultAssignee(sb: SupabaseClient, clientId: string, subServiceId: string, userId: string | null): Promise<number> {
  const { data, error } = await sb
    .from('client_sub_services')
    .update({ default_assignee_id: userId, updated_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('sub_service_id', subServiceId)
    .select('id');
  if (error) throw error;
  return (data ?? []).length;
}

/** Open tasks per person, for splitting work by workload. */
export async function countOpenTasksByAssignee(sb: SupabaseClient): Promise<Record<string, number>> {
  const rows = await fetchAll<{ assigned_to: string | null }>(() =>
    sb.from('tasks').select('assigned_to').eq('is_deleted', false).in('status', ['pending', 'in_progress']).not('assigned_to', 'is', null),
  );
  const out: Record<string, number> = {};
  for (const r of rows) if (r.assigned_to) out[r.assigned_to] = (out[r.assigned_to] ?? 0) + 1;
  return out;
}
