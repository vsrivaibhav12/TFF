// Pure helpers for task numbers (T-YY-NNNN) and for explaining task write errors.

/** The number at the end of a task number, or 0 when there is none. */
export function parseTaskSequence(taskNumber: string | null | undefined): number {
  const m = /(\d+)$/.exec(taskNumber ?? '');
  return m ? parseInt(m[1], 10) : 0;
}

/** Four digits at least, and never fewer than the number needs: 9999 is T-26-9999 and 10000 is T-26-10000. */
export function formatTaskNumber(prefix: string, sequence: number): string {
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

type DbError = { code?: string; message?: string; details?: string };

/**
 * What to do with a failed task insert. Only a clash on the task number is worth retrying with the next
 * number; a clash on client, service and period means the task already exists.
 */
export function classifyTaskInsertError(error: DbError): 'retry_number' | 'duplicate_period' | 'other' {
  const text = `${error.message ?? ''} ${error.details ?? ''}`;
  if (/uniq_active_task_period_key|uniq_active_task_per_period/.test(text)) return 'duplicate_period';
  if (error.code === '23505' && /task_number/.test(text)) return 'retry_number';
  return 'other';
}

/** Plain words for database errors a person can act on. */
export function friendlyTaskWriteMessage(message: string): string {
  if (/uniq_active_task_period_key|uniq_active_task_per_period/.test(message)) {
    return 'This client already has a task for this service and period';
  }
  if (/tasks_due_date_check/.test(message)) {
    return 'The due date cannot be before the day the task was created';
  }
  return message;
}
