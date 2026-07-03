import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface WorkDoneRow {
  id: string;
  task_id: string | null;
  user_id: string;
  client_id: string | null;
  work_date: string;
  duration_minutes: number;
  note: string | null;
  entry_method: 'timer' | 'manual';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  users_profile?: { full_name: string } | null;
  tasks?: { title: string } | null;
  clients?: { business_name: string } | null;
}

export interface WorkDoneSummaryRow {
  user_id: string;
  user_name: string;
  client_id: string;
  client_name: string;
  total_minutes: number;
}

export async function listWorkDone(opts: {
  userId?: string;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  taskId?: string;
  search?: string;
} = {}) {
  const sb = createClient();
  let q = sb
    .from('task_workdone')
    .select('id, task_id, user_id, client_id, work_date, duration_minutes, note, entry_method, started_at, ended_at, created_at, tasks(title), clients(business_name), users_profile!task_workdone_user_id_fkey(full_name)')
    .order('work_date', { ascending: false })
    .limit(200);

  if (opts.userId) q = q.eq('user_id', opts.userId);
  if (opts.startDate) q = q.gte('work_date', opts.startDate);
  if (opts.endDate) q = q.lte('work_date', opts.endDate);
  if (opts.clientId) q = q.eq('client_id', opts.clientId);
  if (opts.taskId) q = q.eq('task_id', opts.taskId);
  if (opts.search) q = q.ilike('note', `%${opts.search}%`);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as WorkDoneRow[];
}

export async function listWorkDoneForTask(taskId: string): Promise<WorkDoneRow[]> {
  const sb = createClient();
  const { data } = await sb
    .from('task_workdone')
    .select('id, user_id, work_date, duration_minutes, note, entry_method, started_at, ended_at, created_at, users_profile!task_workdone_user_id_fkey(full_name)')
    .eq('task_id', taskId)
    .order('work_date', { ascending: false })
    .limit(200);
  return (data ?? []) as unknown as WorkDoneRow[];
}

export async function listWorkDoneForUser(userId: string, fromIso: string, toIso: string): Promise<WorkDoneRow[]> {
  const sb = createClient();
  const { data } = await sb
    .from('task_workdone')
    .select('id, task_id, client_id, work_date, duration_minutes, note, entry_method, started_at, ended_at, created_at, tasks(title), clients(business_name)')
    .eq('user_id', userId)
    .gte('work_date', fromIso)
    .lte('work_date', toIso)
    .order('work_date', { ascending: false })
    .limit(200);
  return (data ?? []) as unknown as WorkDoneRow[];
}

export async function listWorkDoneSummary(fromIso: string, toIso: string): Promise<WorkDoneSummaryRow[]> {
  const sb = createClient();
  const { data, error } = await sb.rpc('list_workdone_summary', {
    p_from: fromIso,
    p_to: toIso,
  });
  if (error) throw error;
  return ((data ?? []) as Array<{
    user_id: string;
    user_name: string;
    client_id: string;
    client_name: string;
    total_minutes: number | string;
  }>).map((r) => ({
    user_id: r.user_id,
    user_name: r.user_name ?? 'Unknown',
    client_id: r.client_id,
    client_name: r.client_name ?? 'Unknown',
    total_minutes: Number(r.total_minutes),
  }));
}

export async function addWorkDoneRecord(payload: {
  user_id: string;
  task_id?: string | null;
  client_id?: string | null;
  work_date: string;
  duration_minutes: number;
  note?: string | null;
  entry_method: 'timer' | 'manual';
  started_at?: string | null;
  ended_at?: string | null;
}) {
  const sb = createClient();
  const { data, error } = await sb.from('task_workdone').insert(payload).select().single();
  if (error) throw error;
  return data as WorkDoneRow;
}

export async function deleteWorkDoneRecord(id: string) {
  const sb = createClient();
  const { error } = await sb.from('task_workdone').delete().eq('id', id);
  if (error) throw error;
}
