export function canModifyTask(
  task: { status: string; is_deleted?: boolean | null },
  toStatus?: string
): boolean {
  if (task.is_deleted) return false;
  if (task.status === 'completed' && toStatus !== 'in_progress') return false;
  return true;
}

/** Fields an admin may still correct on a completed task. Everything else needs a reopen. */
export const CLOSED_TASK_EDITABLE_FIELDS: readonly string[] = [
  'title',
  'description',
  'period_year',
  'period_month',
  'period_quarter',
  'sub_service_id',
  'task_template_id',
  'is_billable',
  'bill_reference',
  'bill_amount',
  'arn_reference',
  'is_arn_client_visible',
  'labels',
  'custom_fields',
];

export type EditCheck =
  | { ok: true }
  | { ok: false; code: 'IMMUTABLE' | 'FORBIDDEN'; reason: string };

type EditableTaskState = { status: string; is_deleted?: boolean | null };

/** Decide whether the actor may change the given fields of a task in its current state. */
export function canEditTaskFields(
  task: EditableTaskState,
  fields: readonly string[],
  actor: { isAdmin: boolean },
): EditCheck {
  if (task.is_deleted) {
    return { ok: false, code: 'IMMUTABLE', reason: 'Deleted tasks cannot be modified' };
  }
  if (task.status !== 'completed') return { ok: true };
  if (!actor.isAdmin) {
    return { ok: false, code: 'FORBIDDEN', reason: 'Only admins can edit completed tasks' };
  }
  const locked = fields.filter((f) => !CLOSED_TASK_EDITABLE_FIELDS.includes(f));
  if (locked.length > 0) {
    return {
      ok: false,
      code: 'IMMUTABLE',
      reason: `Reopen the task to change ${locked.join(', ')}`,
    };
  }
  return { ok: true };
}

export type TaskEditMode = 'full' | 'limited' | 'none';

/** What the task panel should offer: every field, only the correctable ones, or nothing. */
export function taskEditMode(
  task: EditableTaskState,
  actor: { canEdit: boolean; isAdmin: boolean },
): TaskEditMode {
  if (!actor.canEdit || task.is_deleted) return 'none';
  if (task.status === 'completed') return actor.isAdmin ? 'limited' : 'none';
  return 'full';
}

export function canCompleteTask(
  task: { status: string; is_billable?: boolean | null; bill_reference?: string | null; bill_amount?: number | null },
  payload?: { bill_reference?: string; bill_amount?: number }
): { ok: true } | { ok: false; reason: string } {
  if (task.status === 'completed') return { ok: false, reason: 'Task is already completed' };
  if (task.is_billable) {
    const ref = payload?.bill_reference ?? task.bill_reference;
    const amt = payload?.bill_amount ?? task.bill_amount;
    if (!ref) {
      return { ok: false, reason: 'Billable tasks require a bill reference before completion' };
    }
    if (amt == null || amt <= 0) {
      return { ok: false, reason: 'Billable tasks require a bill amount before completion' };
    }
  }
  return { ok: true };
}
