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

export async function countOverdueFilings() {
  const sb = createClient();
  const { count } = await sb.from('compliance_status').select('id', { head: true, count: 'exact' }).eq('is_overdue', true);
  return count ?? 0;
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

export async function listUpcomingNotices(from: string, limit = 6) {
  const sb = createClient();
  const { data } = await sb
    .from('notices')
    .select('id, subject, notice_type, status, due_date, clients!notices_client_id_fkey(business_name)')
    .eq('is_deleted', false)
    .gte('due_date', from)
    .order('due_date', { ascending: true })
    .limit(limit);
  for (const row of (data ?? []) as any[]) {
    if (row && Array.isArray(row.clients) && row.clients.length > 0) {
      row.clients = row.clients[0];
    } else if (row && Array.isArray(row.clients)) {
      row.clients = null;
    }
  }
  return (data ?? []) as unknown as { id: string; subject: string; notice_type: string; status: string; due_date: string; clients: { business_name: string } | null }[];
}

export async function listUrgentNotices(limit = 3) {
  const sb = createClient();
  const { data } = await sb
    .from('notices')
    .select('id, subject, notice_type, status, due_date, clients!notices_client_id_fkey(business_name)')
    .in('status', ['received', 'reply_pending', 'hearing_pending'])
    .order('due_date')
    .limit(limit);
  return data ?? [];
}


export async function listAttentionTasks(limit = 3) {
  const sb = createClient();
  const { data } = await sb
    .from('tasks')
    .select('id, title, status, priority, is_stuck, clients!tasks_client_id_fkey(business_name)')
    .eq('is_deleted', false)
    .or('status.eq.pending,is_stuck.eq.true')
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

export async function countOpenQueries() {
  const sb = createClient();
  const { count } = await sb.from('queries').select('id', { head: true, count: 'exact' }).eq('is_deleted', false).in('status', ['open', 'in_progress']);
  return count ?? 0;
}

export async function listOpenQueries(limit = 3) {
  const sb = createClient();
  const { data } = await sb
    .from('queries')
    .select('id, subject, status, created_at, clients!queries_client_id_fkey(business_name)')
    .eq('is_deleted', false)
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(limit);
  for (const row of (data ?? []) as any[]) {
    if (row && Array.isArray(row.clients) && row.clients.length > 0) {
      row.clients = row.clients[0];
    } else if (row && Array.isArray(row.clients)) {
      row.clients = null;
    }
  }
  return (data ?? []) as unknown as { id: string; subject: string; status: string; created_at: string; clients: { business_name: string } | null }[];
}
