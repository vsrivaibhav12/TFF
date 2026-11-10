import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/supabase/fetch-all';

export interface TaskStepRow {
  id: string;
  task_id: string;
  step_order: number;
  title: string;
  description: string | null;
  is_required: boolean;
  completed_at: string | null;
  completed_by: string | null;
  completion_note: string | null;
  source_sop_step_id: string | null;
  source_template_step_id: string | null;
  guidance_notes: string | null;
  users_profile?: { full_name: string | null; email: string | null } | null;
}

/**
 * List all task_steps for a given task in order, joined with the user who signed off.
 */
export async function listTaskSteps(taskId: string): Promise<TaskStepRow[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_steps')
    .select(
      'id, task_id, step_order, title, description, is_required, completed_at, completed_by, completion_note, source_sop_step_id, source_template_step_id, guidance_notes, users_profile:completed_by(full_name, email)',
    )
    .eq('task_id', taskId)
    .order('step_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TaskStepRow[];
}

type StepCompletion = { total: number; completed: number; allRequiredDone: boolean };

function summariseSteps(rows: Array<{ is_required: boolean; completed_at: string | null }>): StepCompletion {
  // Progress counts EVERY step, the same as the checklist panel on the task page.
  // It used to count required steps only, so a task whose steps were all optional
  // (for example steps added ad hoc) showed 0% however many boxes were ticked.
  const completed = rows.filter((r) => !!r.completed_at).length;
  const required = rows.filter((r) => r.is_required);
  const requiredDone = required.filter((r) => !!r.completed_at).length;
  return {
    total: rows.length,
    completed,
    allRequiredDone: required.length === 0 || requiredDone === required.length,
  };
}

/**
 * Returns step completion state for a task.
 * - total / completed: all steps, required or not
 * - allRequiredDone: true when every required step is done (or none are required)
 */
export async function getTaskStepCompletion(taskId: string): Promise<StepCompletion> {
  const sb = createClient();
  const { data, error } = await sb
    .from('task_steps')
    .select('id, is_required, completed_at')
    .eq('task_id', taskId);
  if (error) throw error;
  return summariseSteps((data ?? []) as Array<{ is_required: boolean; completed_at: string | null }>);
}

const TASK_ID_CHUNK = 150;

/**
 * Batch version of getTaskStepCompletion for multiple tasks.
 * Task ids are queried in chunks and every chunk is paged, so the result is
 * complete even when the steps for these tasks add up to more than 1,000 rows
 * (the API silently truncates at 1,000, which made later tasks show 0%).
 */
export async function getTaskStepCompletionBatch(
  taskIds: string[],
): Promise<Map<string, StepCompletion>> {
  const sb = createClient();
  const byTask = new Map<string, StepCompletion>();
  for (const id of taskIds) byTask.set(id, { total: 0, completed: 0, allRequiredDone: true });

  const grouped = new Map<string, Array<{ is_required: boolean; completed_at: string | null }>>();
  for (let i = 0; i < taskIds.length; i += TASK_ID_CHUNK) {
    const chunk = taskIds.slice(i, i + TASK_ID_CHUNK);
    const rows = await fetchAll<{ id: string; task_id: string; is_required: boolean; completed_at: string | null }>(() =>
      sb.from('task_steps').select('id, task_id, is_required, completed_at').in('task_id', chunk).order('id'),
    );
    for (const row of rows) {
      const list = grouped.get(row.task_id) ?? [];
      list.push(row);
      grouped.set(row.task_id, list);
    }
  }

  for (const [taskId, rows] of grouped) byTask.set(taskId, summariseSteps(rows));
  return byTask;
}

/**
 * Returns percentage completion (0-100) across all steps.
 */
export async function getTaskProgressPct(taskId: string): Promise<number> {
  const { total, completed } = await getTaskStepCompletion(taskId);
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
