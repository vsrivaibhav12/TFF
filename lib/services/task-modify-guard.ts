export function canModifyTask(
  task: { status: string; is_deleted?: boolean | null },
  toStatus?: string
): boolean {
  if (task.is_deleted) return false;
  if (task.status === 'completed' && toStatus !== 'in_progress') return false;
  return true;
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
