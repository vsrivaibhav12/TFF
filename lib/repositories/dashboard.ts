import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function countActiveClients() {
  const sb = createClient();
  const { count } = await sb.from('clients').select('id', { head: true, count: 'exact' }).eq('is_deleted', false);
  return count ?? 0;
}

export async function countOpenTasks() {
  const sb = createClient();
  const { count } = await sb.from('tasks').select('id', { head: true, count: 'exact' }).eq('is_deleted', false).in('status', ['pending', 'in_progress']);
  return count ?? 0;
}

/** Open tasks whose due date has passed. Same definition the priority list and Tasks page use. */
export async function countOverdueFilings(todayIso: string) {
  const sb = createClient();
  const { count } = await sb
    .from('tasks')
    .select('id', { head: true, count: 'exact' })
    .eq('is_deleted', false)
    .in('status', ['pending', 'in_progress'])
    .lt('due_date', todayIso);
  return count ?? 0;
}

/** Short display names for the entities named in audit rows, keyed by `${type}:${id}`. */
export async function resolveAuditEntityLabels(
  entities: { entity_type?: string | null; entity_id?: string | null }[],
): Promise<Record<string, string>> {
  const taskIds = [...new Set(entities.filter((e) => e.entity_type === 'task' && e.entity_id).map((e) => e.entity_id as string))].slice(0, 100);
  const clientIds = [...new Set(entities.filter((e) => e.entity_type === 'client' && e.entity_id).map((e) => e.entity_id as string))].slice(0, 100);
  const sb = createClient();
  const out: Record<string, string> = {};
  const [tasks, clients] = await Promise.all([
    taskIds.length
      ? sb.from('tasks').select('id, title, clients!tasks_client_id_fkey(business_name)').in('id', taskIds)
      : Promise.resolve({ data: [] as any[] }),
    clientIds.length
      ? sb.from('clients').select('id, business_name').in('id', clientIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  for (const t of (tasks.data ?? []) as any[]) {
    const client = Array.isArray(t.clients) ? t.clients[0] : t.clients;
    out[`task:${t.id}`] = client?.business_name ? `${t.title} · ${client.business_name}` : t.title;
  }
  for (const c of (clients.data ?? []) as any[]) out[`client:${c.id}`] = c.business_name;
  return out;
}

export async function countActiveEngagements() {
  const sb = createClient();
  const { count } = await sb.from('client_sub_services').select('id', { head: true, count: 'exact' }).eq('is_active', true);
  return count ?? 0;
}

export async function listRecentTasks(limit = 5) {
  const sb = createClient();
  const { data } = await sb
    .from('tasks')
    .select('id, task_number, title, status, priority, due_date, clients!tasks_client_id_fkey(id, business_name), assigned_to, users_profile!tasks_assigned_to_fkey(full_name)')
    .eq('is_deleted', false)
    .in('status', ['pending', 'in_progress'])
    .order('due_date')
    .limit(limit);
  return data ?? [];
}

export async function listUpcomingDeadlines(from: string, to: string, limit = 6) {
  const sb = createClient();
  const { data } = await sb
    .from('compliance_calendar_events')
    .select('id, client_id, rule_code, period_label, due_date, status, clients!compliance_calendar_events_client_id_fkey(business_name), compliance_calendar_rules!compliance_calendar_events_rule_id_fkey(display_name, service_kind)')
    .eq('is_deleted', false)
    .gte('due_date', from)
    .lte('due_date', to)
    .order('due_date', { ascending: true })
    .limit(limit);
  return data ?? [];
}


export async function listAttentionTasks(todayIso: string, limit = 3) {
  const sb = createClient();
  const { data } = await sb
    .from('tasks')
    .select('id, title, status, priority, is_stuck, due_date, clients!tasks_client_id_fkey(business_name)')
    .eq('is_deleted', false)
    .in('status', ['pending', 'in_progress'])
    // todayIso is a server-built date string, never user input.
    .or(`is_stuck.eq.true,due_date.lt.${todayIso}`)
    // Stuck tasks first, then the earliest due date, so the "needs attention" list is meaningful.
    .order('is_stuck', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })
    .limit(limit);
  return data ?? [];
}

export async function getComplianceStatusSummary(limit = 500) {
  const sb = createClient();
  const { data } = await sb.from('compliance_status').select('status').limit(limit);
  const filed = data?.filter((r) => r.status === 'filed').length ?? 0;
  const pending = data?.filter((r) => r.status === 'pending').length ?? 0;
  const overdue = data?.filter((r) => r.status === 'overdue').length ?? 0;
  const total = filed + pending + overdue;
  return { filed, pending, overdue, total, rate: total > 0 ? Math.round((filed / total) * 100) : 0 };
}

export async function getPendingApprovals() {
  const sb = createClient();
  const [{ count: leaveCount, data: leaveData }, { count: permissionCount }, { count: timesheetCount }] = await Promise.all([
    sb.from('leave_requests').select('id, status, users_profile!leave_requests_user_id_fkey(full_name)', { count: 'exact' }).eq('status', 'pending').limit(2),
    sb.from('permission_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
    sb.from('weekly_timesheet_submissions').select('id', { count: 'exact' }).eq('status', 'submitted'),
  ]);
  return {
    total: (leaveCount ?? 0) + (permissionCount ?? 0) + (timesheetCount ?? 0),
    leaveCount: leaveCount ?? 0,
    leavePreview: leaveData ?? [],
  };
}

