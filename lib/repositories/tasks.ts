import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { TaskStatus } from '@/lib/validation/schemas';
import { todayIST } from '@/lib/utils';

function normalizeFkArray(row: any, key: string) {
  if (row && Array.isArray(row[key]) && row[key].length > 0) {
    row[key] = row[key][0];
  } else if (row && Array.isArray(row[key])) {
    row[key] = null;
  }
}

export async function listTasks(opts: {
  clientId?: string;
  assignedTo?: string;
  status?: Array<TaskStatus | 'blocked' | 'stuck'>;
  priority?: string[];
  subServiceId?: string;
  dueFrom?: string;
  dueTo?: string;
  limit?: number;
} = {}) {
  const sb = createClient();
  let q = sb
    .from('tasks')
    .select('id, task_number, title, status, priority, due_date, period_year, period_month, period_quarter, assigned_to, reviewer_id, sub_service_id, client_id, is_blocked_on_client, is_stuck, stuck_reason_code, verification_status, is_billable, bill_reference, is_verified, created_at, updated_at, clients!tasks_client_id_fkey(id, business_name), users_profile!tasks_assigned_to_fkey(id, full_name, email)')
    .eq('is_deleted', false)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (opts.clientId) q = q.eq('client_id', opts.clientId);
  if (opts.assignedTo) q = q.eq('assigned_to', opts.assignedTo);
  if (opts.subServiceId) q = q.eq('sub_service_id', opts.subServiceId);
  if (opts.dueFrom) q = q.gte('due_date', opts.dueFrom);
  if (opts.dueTo) q = q.lte('due_date', opts.dueTo);
  if (opts.priority?.length) q = q.in('priority', opts.priority);

  if (opts.status?.length) {
    const hasBlocked = opts.status.includes('blocked');
    const hasStuck = opts.status.includes('stuck');
    const realStatuses = opts.status.filter((s): s is TaskStatus =>
      s === 'pending' || s === 'in_progress' || s === 'completed' || s === 'cancelled',
    );

    if (hasBlocked && hasStuck && realStatuses.length === 0) {
      q = q.or('is_blocked_on_client.eq.true,is_stuck.eq.true');
    } else if (hasBlocked && hasStuck && realStatuses.length > 0) {
      q = q.or(`is_blocked_on_client.eq.true,is_stuck.eq.true,status.in.(${realStatuses.join(',')})`);
    } else if (hasBlocked && realStatuses.length > 0) {
      q = q.or(`is_blocked_on_client.eq.true,status.in.(${realStatuses.join(',')})`);
    } else if (hasStuck && realStatuses.length > 0) {
      q = q.or(`is_stuck.eq.true,status.in.(${realStatuses.join(',')})`);
    } else if (hasBlocked) {
      q = q.eq('is_blocked_on_client', true);
    } else if (hasStuck) {
      q = q.eq('is_stuck', true);
    } else if (realStatuses.length > 0) {
      q = q.in('status', realStatuses);
    }
  }

  const limit = opts.limit ?? 100;
  q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  for (const row of (data ?? []) as any[]) {
    normalizeFkArray(row, 'users_profile');
    normalizeFkArray(row, 'clients');
  }
  return data ?? [];
}

export async function getTask(id: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('tasks')
    .select('*, clients!tasks_client_id_fkey(id, business_name), sub_services!tasks_sub_service_id_fkey(code, name, services!sub_services_service_id_fkey(name)), assignee:users_profile!tasks_assigned_to_fkey(id, full_name, email), reviewer:users_profile!tasks_reviewer_id_fkey(id, full_name, email)')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    normalizeFkArray(data, 'assignee');
    normalizeFkArray(data, 'reviewer');
    normalizeFkArray(data, 'clients');
    normalizeFkArray(data, 'sub_services');
    if (data.sub_services) {
      normalizeFkArray(data.sub_services, 'services');
    }
  }
  return data;
}

export async function listTaskActivity(taskId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_activity')
    .select('id, action, field_name, old_value, new_value, created_at, users_profile!task_activity_changed_by_fkey(full_name, email)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listTaskNotes(taskId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_notes')
    .select('id, note_text, created_at, users_profile!task_notes_created_by_fkey(full_name, email, role)')
    .eq('task_id', taskId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function countTasksByStatus(opts: { assignedTo?: string; clientId?: string } = {}) {
  const sb = createClient();
  const counts: Record<string, number> = {};
  // Use individual count queries with head:true to avoid fetching all rows
  const statuses = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
  await Promise.all(
    statuses.map(async (status) => {
      let q = sb.from('tasks').select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .eq('status', status);
      if (opts.assignedTo) q = q.eq('assigned_to', opts.assignedTo);
      if (opts.clientId) q = q.eq('client_id', opts.clientId);
      const { count, error } = await q;
      if (!error) counts[status] = count ?? 0;
    })
  );
  return counts;
}

export async function countOverdueTasks(opts: { assignedTo?: string } = {}) {
  const sb = createClient();
  const today = todayIST();
  let q = sb.from('tasks').select('id', { count: 'exact', head: true })
    .eq('is_deleted', false)
    .lt('due_date', today)
    .not('status', 'in', '(completed,cancelled)');
  if (opts.assignedTo) q = q.eq('assigned_to', opts.assignedTo);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function createTaskRecord(payload: any) {
  const sb = createClient();
  const { data, error } = await sb.from('tasks').insert(payload).select('id').single();
  if (error) throw error;
  return data;
}

export async function updateTaskRecord(id: string, payload: any) {
  const sb = createClient();
  const { error } = await sb.from('tasks').update(payload).eq('id', id);
  if (error) throw error;
}

export async function softDeleteTaskRecord(id: string, userId: string) {
  const sb = createClient();
  const { error } = await sb.from('tasks').update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    deleted_by: userId,
  }).eq('id', id);
  if (error) throw error;
}

/**
 * Generate the next sequential task number.
 * Format: T-YY-NNNN (e.g. T-26-0001).
 */
export async function generateNextTaskNumber(): Promise<string> {
  const sb = createClient();
  const yy = new Date().getFullYear().toString().slice(-2);
  const prefix = `T-${yy}-`;
  const { data } = await sb
    .from('tasks')
    .select('task_number')
    .eq('is_deleted', false)
    .ilike('task_number', `${prefix}%`)
    .order('task_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastNum = data?.task_number ? parseInt(data.task_number.slice(-4), 10) : 0;
  const next = (lastNum + 1).toString().padStart(4, '0');
  return `${prefix}${next}`;
}

/**
 * Create a task with an auto-generated task number, retrying on unique constraint violations.
 * This combines number generation and insertion to prevent race conditions.
 */
export async function createTaskWithAutoNumber(payload: any, maxRetries = 5): Promise<{ id: string; task_number: string }> {
  const sb = createClient();
  const yy = new Date().getFullYear().toString().slice(-2);
  const prefix = `T-${yy}-`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { data: maxRow } = await sb
      .from('tasks')
      .select('task_number')
      .eq('is_deleted', false)
      .ilike('task_number', `${prefix}%`)
      .order('task_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastNum = maxRow?.task_number ? parseInt(maxRow.task_number.slice(-4), 10) : 0;
    const next = (lastNum + 1 + attempt).toString().padStart(4, '0');
    const candidate = `${prefix}${next}`;

    const { data: inserted, error } = await sb
      .from('tasks')
      .insert({ ...payload, task_number: candidate })
      .select('id, task_number')
      .single();

    if (!error) return inserted as { id: string; task_number: string };

    // Retry only on unique violation (23505)
    if (error.code === '23505' || error.message?.includes('tasks_task_number_key')) {
      continue;
    }
    throw error;
  }

  throw new Error('Failed to generate unique task number after maximum retries');
}

export async function addTaskActivity(payload: any) {
  const sb = createClient();
  const { error } = await sb.from('task_activity').insert(payload);
  if (error) throw error;
}

export async function addTaskNoteRecord(payload: any) {
  const sb = createClient();
  const { error } = await sb.from('task_notes').insert(payload);
  if (error) throw error;
}

export async function getTaskSteps(taskId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_steps')
    .select('id, is_required, completed_at')
    .eq('task_id', taskId);
  if (error) throw error;
  return data;
}

export async function getSubServiceRequiresVerification(subServiceId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('sub_services')
    .select('requires_verification')
    .eq('id', subServiceId)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Enrich a list of tasks with progress_pct from task_steps.
 * Efficiently batches progress lookups.
 */
export async function enrichTasksWithProgress(tasks: any[]): Promise<any[]> {
  if (tasks.length === 0) return tasks;
  const { getTaskStepCompletion } = await import('./task-steps');
  const enriched = await Promise.all(
    tasks.map(async (t) => {
      const { total, completed } = await getTaskStepCompletion(t.id);
      const progress_pct = total === 0 ? 0 : Math.round((completed / total) * 100);
      return { ...t, progress_pct, step_total: total, step_completed: completed };
    })
  );
  return enriched;
}
