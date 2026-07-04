import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { TaskStatus } from '@/lib/validation/schemas';
import { todayIST } from '@/lib/utils';
import { mergeById, wrapLike } from '@/lib/supabase/safe-search';

export interface TaskRow {
  id: string;
  task_number: string | null;
  title: string;
  status: TaskStatus;
  priority: string;
  due_date: string | null;
  period_year: number | null;
  period_month: number | null;
  period_quarter: number | null;
  assigned_to: string | null;
  reviewer_id: string | null;
  sub_service_id: string | null;
  client_id: string | null;
  is_blocked_on_client: boolean;
  is_stuck: boolean;
  stuck_reason_code: string | null;
  verification_status: string | null;
  is_billable: boolean;
  bill_reference: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  clients: { id: string; business_name: string } | null;
  users_profile: { id: string; full_name: string; email: string } | null;
  sub_services: { id: string; code: string; name: string } | null;
}

export interface TaskDetail extends TaskRow {
  assignee: { id: string; full_name: string; email: string } | null;
  reviewer: { id: string; full_name: string; email: string } | null;
  sub_services: { id: string; code: string; name: string; services: { name: string } | null } | null;
  description: string | null;
  bill_amount: number | null;
  arn_reference: string | null;
  is_arn_client_visible: boolean;
  started_date: string | null;
}

function normalizeFkArray(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (row && Array.isArray(value) && value.length > 0) {
    row[key] = value[0];
  } else if (row && Array.isArray(value)) {
    row[key] = null;
  }
}

export async function listTasks(opts: {
  clientId?: string;
  assignedTo?: string;
  status?: Array<TaskStatus | 'blocked' | 'stuck'>;
  priority?: string[];
  subServiceIds?: string[];
  dueFrom?: string;
  dueTo?: string;
  periodYear?: number;
  periodMonth?: number;
  isBillable?: boolean;
  isStuck?: boolean;
  isVerified?: boolean;
  labels?: string[];
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<TaskRow[]> {
  const sb = createClient();

  // Pre-filter by labels if specified
  let labelTaskIds: string[] | undefined;
  if (opts.labels?.length) {
    const { data: la } = await sb
      .from('task_label_assignments')
      .select('task_id')
      .in('label_code', opts.labels);
    labelTaskIds = [...new Set((la ?? []).map((d: { task_id: string }) => d.task_id))];
    if (labelTaskIds.length === 0) return [];
  }

  let q = sb
    .from('tasks')
    .select('id, task_number, title, status, priority, due_date, period_year, period_month, period_quarter, assigned_to, reviewer_id, sub_service_id, client_id, is_blocked_on_client, is_stuck, stuck_reason_code, verification_status, is_billable, bill_reference, is_verified, created_at, updated_at, clients!tasks_client_id_fkey(id, business_name), users_profile!tasks_assigned_to_fkey(id, full_name, email), sub_services!tasks_sub_service_id_fkey(id, code, name)')
    .eq('is_deleted', false)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (labelTaskIds?.length) q = q.in('id', labelTaskIds);
  if (opts.clientId) q = q.eq('client_id', opts.clientId);
  if (opts.subServiceIds?.length) q = q.in('sub_service_id', opts.subServiceIds);
  if (opts.dueFrom) q = q.gte('due_date', opts.dueFrom);
  if (opts.dueTo) q = q.lte('due_date', opts.dueTo);
  if (opts.periodYear) q = q.eq('period_year', opts.periodYear);
  if (opts.periodMonth) q = q.eq('period_month', opts.periodMonth);
  if (opts.isBillable !== undefined) q = q.eq('is_billable', opts.isBillable);
  if (opts.isStuck !== undefined) q = q.eq('is_stuck', opts.isStuck);
  if (opts.isVerified !== undefined) q = q.eq('is_verified', opts.isVerified);
  if (opts.priority?.length) q = q.in('priority', opts.priority);
  
  if (opts.assignedTo === 'unassigned') {
    q = q.is('assigned_to', null);
  } else if (opts.assignedTo) {
    q = q.eq('assigned_to', opts.assignedTo);
  }

  if (opts.q?.trim()) {
    const term = wrapLike(opts.q.trim());
    // Search related tables and local columns with separate queries to avoid
    // PostgREST `.or()` injection from user input.
    const [
      { data: titleMatches },
      { data: numberMatches },
      { data: clientMatches },
      { data: subServiceMatches },
    ] = await Promise.all([
      sb.from('tasks').select('id').ilike('title', term).eq('is_deleted', false),
      sb.from('tasks').select('id').ilike('task_number', term).eq('is_deleted', false),
      sb.from('clients').select('id').ilike('business_name', term).eq('is_deleted', false),
      sb.from('sub_services').select('id').ilike('name', term).eq('is_deleted', false),
    ]);
    const matchedIds = mergeById([
      titleMatches ?? [],
      numberMatches ?? [],
      clientMatches ?? [],
      subServiceMatches ?? [],
    ]).map((r) => r.id);
    if (matchedIds.length === 0) {
      // No matches — force empty result without issuing another query.
      return [];
    }
    q = q.in('id', matchedIds);
  }

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
  const offset = opts.offset ?? 0;
  q = q.range(offset, offset + limit - 1);
  const { data, error } = await q;
  if (error) throw error;
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    normalizeFkArray(row, 'users_profile');
    normalizeFkArray(row, 'clients');
    normalizeFkArray(row, 'sub_services');
  }
  return (data ?? []) as unknown as TaskRow[];
}

export async function countTasks(opts: {
  clientId?: string;
  assignedTo?: string;
  status?: Array<TaskStatus | 'blocked' | 'stuck'>;
  priority?: string[];
  subServiceIds?: string[];
  dueFrom?: string;
  dueTo?: string;
  periodYear?: number;
  periodMonth?: number;
  isBillable?: boolean;
  isStuck?: boolean;
  isVerified?: boolean;
  labels?: string[];
  q?: string;
} = {}) {
  const sb = createClient();

  let labelTaskIds: string[] | undefined;
  if (opts.labels?.length) {
    const { data: la } = await sb
      .from('task_label_assignments')
      .select('task_id')
      .in('label_code', opts.labels);
    labelTaskIds = [...new Set((la ?? []).map((d: { task_id: string }) => d.task_id))];
    if (labelTaskIds.length === 0) return 0;
  }

  let q = sb
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('is_deleted', false);
  if (labelTaskIds?.length) q = q.in('id', labelTaskIds);
  if (opts.clientId) q = q.eq('client_id', opts.clientId);
  if (opts.subServiceIds?.length) q = q.in('sub_service_id', opts.subServiceIds);
  if (opts.dueFrom) q = q.gte('due_date', opts.dueFrom);
  if (opts.dueTo) q = q.lte('due_date', opts.dueTo);
  if (opts.periodYear) q = q.eq('period_year', opts.periodYear);
  if (opts.periodMonth) q = q.eq('period_month', opts.periodMonth);
  if (opts.isBillable !== undefined) q = q.eq('is_billable', opts.isBillable);
  if (opts.isStuck !== undefined) q = q.eq('is_stuck', opts.isStuck);
  if (opts.isVerified !== undefined) q = q.eq('is_verified', opts.isVerified);
  if (opts.priority?.length) q = q.in('priority', opts.priority);

  if (opts.assignedTo === 'unassigned') {
    q = q.is('assigned_to', null);
  } else if (opts.assignedTo) {
    q = q.eq('assigned_to', opts.assignedTo);
  }

  if (opts.q?.trim()) {
    const term = wrapLike(opts.q.trim());
    const [
      { data: titleMatches },
      { data: numberMatches },
      { data: clientMatches },
      { data: subServiceMatches },
    ] = await Promise.all([
      sb.from('tasks').select('id').ilike('title', term).eq('is_deleted', false),
      sb.from('tasks').select('id').ilike('task_number', term).eq('is_deleted', false),
      sb.from('clients').select('id').ilike('business_name', term).eq('is_deleted', false),
      sb.from('sub_services').select('id').ilike('name', term).eq('is_deleted', false),
    ]);
    const matchedIds = mergeById([
      titleMatches ?? [],
      numberMatches ?? [],
      clientMatches ?? [],
      subServiceMatches ?? [],
    ]).map((r) => r.id);
    if (matchedIds.length === 0) {
      return 0;
    }
    q = q.in('id', matchedIds);
  }

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

  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function getTask(id: string): Promise<TaskDetail | null> {
  const sb = createClient();
  const { data, error } = await sb
    .from('tasks')
    .select(`
      id, task_number, title, description, status, priority,
      client_id, sub_service_id, task_template_id,
      assigned_to, reviewer_id,
      created_date, due_date, started_date, completed_date,
      period_month, period_year, period_quarter,
      is_billable, bill_reference, bill_amount, billed, billed_date,
      is_recurring, arn_reference, is_arn_client_visible,
      is_verified, is_blocked_on_client, is_stuck, stuck_reason_code, verification_status,
      created_at, updated_at,
      clients!tasks_client_id_fkey(id, business_name),
      sub_services!tasks_sub_service_id_fkey(code, name, services!sub_services_service_id_fkey(name)),
      assignee:users_profile!tasks_assigned_to_fkey(id, full_name, email),
      reviewer:users_profile!tasks_reviewer_id_fkey(id, full_name, email)
    `)
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
      normalizeFkArray(data.sub_services as unknown as Record<string, unknown>, 'services');
    }
    const { data: assignees } = await sb
      .from('task_assignees')
      .select('role, users_profile!task_assignees_user_id_fkey(id, full_name, email)')
      .eq('task_id', id);
    const rows = (assignees ?? []) as Array<{ role: string; users_profile: unknown }>;
    const extractUser = (r: { role: string; users_profile: unknown }) => {
      const u = Array.isArray(r.users_profile) ? r.users_profile[0] : r.users_profile;
      return u && (u as { id?: string }).id ? u : null;
    };
    (data as Record<string, unknown>).assignees = rows.filter((r) => r.role === 'assignee').map(extractUser).filter(Boolean);
    (data as Record<string, unknown>).reviewers = rows.filter((r) => r.role === 'reviewer').map(extractUser).filter(Boolean);
  }
  return data as TaskDetail | null;
}

export async function listTaskActivity(taskId: string, limit = 100) {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_activity')
    .select('id, action, field_name, old_value, new_value, created_at, users_profile!task_activity_changed_by_fkey(full_name, email)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function listTaskNotes(taskId: string, limit = 100) {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_notes')
    .select('id, note_text, created_at, users_profile!task_notes_created_by_fkey(full_name, email, role)')
    .eq('task_id', taskId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function countTasksByStatus(opts: { assignedTo?: string; clientId?: string } = {}) {
  const sb = createClient();
  const counts: Record<string, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };

  const { data, error } = await sb.rpc('count_tasks_by_status', {
    p_assigned_to: opts.assignedTo || null,
    p_client_id: opts.clientId || null,
  });

  if (error) throw error;
  for (const row of (data ?? []) as Array<{ status: string; count: number | string }>) {
    counts[row.status] = Number(row.count);
  }
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

export async function createTaskRecord(payload: Record<string, unknown>) {
  const sb = createClient();
  const { data, error } = await sb.from('tasks').insert(payload).select('id').single();
  if (error) throw error;
  return data;
}

export async function setTaskAssignees(taskId: string, assigneeIds: string[], reviewerIds: string[], assignedBy: string) {
  const sb = createClient();
  const { error: delError } = await sb.from('task_assignees').delete().eq('task_id', taskId);
  if (delError) throw delError;
  const rows = [
    ...assigneeIds.map((userId) => ({ task_id: taskId, user_id: userId, role: 'assignee' as const, assigned_by: assignedBy })),
    ...reviewerIds.map((userId) => ({ task_id: taskId, user_id: userId, role: 'reviewer' as const, assigned_by: assignedBy })),
  ];
  if (rows.length > 0) {
    const { error } = await sb.from('task_assignees').insert(rows);
    if (error) throw error;
  }
}

export async function updateTaskRecord(id: string, payload: Record<string, unknown>) {
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
export async function createTaskWithAutoNumber(payload: Record<string, unknown>, maxRetries = 5): Promise<{ id: string; task_number: string }> {
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
      .insert({ ...payload, task_number: candidate } as Record<string, unknown>)
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

export async function addTaskActivity(payload: Record<string, unknown>) {
  const sb = createClient();
  const { error } = await sb.from('task_activity').insert(payload);
  if (error) throw error;
}

export async function addTaskNoteRecord(payload: Record<string, unknown>) {
  const sb = createClient();
  const { error } = await sb.from('task_notes').insert(payload);
  if (error) throw error;
}

export async function getTaskSteps(taskId: string): Promise<Array<{ id: string; is_required: boolean; completed_at: string | null }>> {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_steps')
    .select('id, is_required, completed_at')
    .eq('task_id', taskId);
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; is_required: boolean; completed_at: string | null }>;
}

export async function getSubServiceRequiresVerification(subServiceId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('sub_services')
    .select('requires_client_input')
    .eq('id', subServiceId)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Enrich a list of tasks with progress_pct from task_steps.
 * Efficiently batches progress lookups (single query for all tasks).
 */
export async function enrichTasksWithProgress<T extends { id: string }>(tasks: T[]): Promise<T[]> {
  if (tasks.length === 0) return tasks;
  const { getTaskStepCompletionBatch } = await import('./task-steps');
  const taskIds = tasks.map((t) => t.id);
  const completions = await getTaskStepCompletionBatch(taskIds);
  return tasks.map((t) => {
    const { total, completed } = completions.get(t.id) ?? { total: 0, completed: 0 };
    const progress_pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { ...t, progress_pct, step_total: total, step_completed: completed };
  });
}

export async function enrichTasksWithLabels<T extends { id: string }>(tasks: T[]): Promise<T[]> {
  if (tasks.length === 0) return tasks;
  const { listLabelsForTasks } = await import('./task-custom-fields');
  const taskIds = tasks.map((t) => t.id);
  const labelMap = await listLabelsForTasks(taskIds);
  return tasks.map((t) => ({ ...t, labels: labelMap.get(t.id) ?? [] }));
}

export async function getTaskClosureVelocity(days = 30): Promise<{ date: string; count: number }[]> {
  const sb = createClient();
  const { todayIST } = await import('@/lib/utils');
  const today = todayIST();

  const { data } = await sb.rpc('get_task_closure_velocity', { p_days: days });

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ date: string; count: number | string }>) {
    counts[row.date] = Number(row.count);
  }

  // Fill in missing dates with 0
  const result: { date: string; count: number }[] = [];
  for (let i = days; i >= 0; i--) {
    const d = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(Date.now() - i * 86_400_000));
    result.push({ date: d, count: counts[d] ?? 0 });
  }
  return result;
}
