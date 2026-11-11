import { createClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/supabase/fetch-all';
import type { SlimTask } from '@/lib/services/home-metrics';

/** Every open task with just the columns the dashboards need. Paged, so it is complete beyond 1,000 rows. */
export async function listOpenSlimTasks(opts: { assignedTo?: string; assignedToAny?: string[] } = {}): Promise<SlimTask[]> {
  const sb = createClient();
  return fetchAll<SlimTask>(() => {
    let q = sb
      .from('tasks')
      .select('id, assigned_to, due_date, is_blocked_on_client, updated_at')
      .eq('is_deleted', false)
      .in('status', ['pending', 'in_progress']);
    if (opts.assignedTo) q = q.eq('assigned_to', opts.assignedTo);
    if (opts.assignedToAny && opts.assignedToAny.length > 0) q = q.in('assigned_to', opts.assignedToAny);
    return q;
  });
}

/** Completed, billable tasks that have not been billed yet. */
export async function listUnbilledCompleted(): Promise<Array<{ bill_amount: number | null }>> {
  const sb = createClient();
  return fetchAll<{ bill_amount: number | null }>(() =>
    sb.from('tasks').select('bill_amount').eq('is_deleted', false).eq('status', 'completed').eq('is_billable', true).eq('billed', false),
  );
}

/** Minutes this person has logged on one date. */
export async function minutesLoggedOn(userId: string, dateIso: string): Promise<number> {
  const sb = createClient();
  const rows = await fetchAll<{ duration_minutes: number | null }>(() =>
    sb.from('task_workdone').select('duration_minutes').eq('user_id', userId).eq('work_date', dateIso),
  );
  return rows.reduce((n, r) => n + (r.duration_minutes ?? 0), 0);
}

export type WaitingTask = { id: string; title: string; updated_at: string | null; client_name: string | null };

/** This person's tasks that are waiting on a client, longest waiting first. */
export async function listWaitingTasks(userId: string, limit = 5): Promise<WaitingTask[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from('tasks')
    .select('id, title, updated_at, clients!tasks_client_id_fkey(business_name)')
    .eq('assigned_to', userId)
    .eq('is_deleted', false)
    .eq('is_blocked_on_client', true)
    .in('status', ['pending', 'in_progress'])
    .order('updated_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    title: r.title,
    updated_at: r.updated_at,
    client_name: (Array.isArray(r.clients) ? r.clients[0]?.business_name : r.clients?.business_name) ?? null,
  }));
}
