import type { TaskFilterOpts } from '@/lib/repositories/tasks';
import type { TaskStatus } from '@/lib/validation/schemas';

/** The raw URL query parameters the task list understands. */
export type TaskFilterParams = {
  status?: string; priority?: string; assigned?: string; client?: string; sub_service?: string;
  due_from?: string; due_to?: string; period_year?: string; period_month?: string;
  is_billable?: string; is_stuck?: string; is_verified?: string; verification?: string; label?: string | string[]; q?: string;
};

/** The task list opens on work that is still open. This is the built-in scope, not a filter the user applies. */
export const DEFAULT_TASK_STATUSES = ['pending', 'in_progress'] as const;

export const TASK_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'blocked', label: 'Awaiting client' },
  { value: 'stuck', label: 'Stuck' },
];

const VALID_STATUS = new Set(TASK_STATUS_OPTIONS.map((o) => o.value));

export function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/**
 * The statuses the list is showing, from the `status` URL parameter. No parameter (or an
 * empty or unusable one) means the default: pending and in progress. Unknown values are dropped.
 */
export function effectiveStatuses(param: string | undefined | null): string[] {
  const picked = [...new Set((param ?? '').split(',').map((s) => s.trim()).filter((s) => VALID_STATUS.has(s)))];
  return picked.length > 0 ? picked : [...DEFAULT_TASK_STATUSES];
}

/** The value to put in the URL for a selection. The default selection needs no parameter at all. */
export function statusParamFor(selection: readonly string[]): string {
  return sameSet(selection, DEFAULT_TASK_STATUSES) || selection.length === 0 ? '' : selection.join(',');
}

const triState = (v: string | undefined) => (v === 'true' ? true : v === 'false' ? false : undefined);

/**
 * Turn URL query parameters into repository filter options. Used by the list page, the export
 * and the "reassign all matching" action, so all of them always agree on which tasks match.
 */
export function parseTaskFilterParams(sp: TaskFilterParams): TaskFilterOpts {
  const labels = Array.isArray(sp.label) ? sp.label : sp.label ? [sp.label] : undefined;
  return {
    status: effectiveStatuses(sp.status) as Array<TaskStatus | 'blocked' | 'stuck'>,
    priority: sp.priority?.split(',').filter(Boolean) ?? [],
    assignedTo: sp.assigned,
    clientId: sp.client,
    subServiceIds: sp.sub_service ? [sp.sub_service] : undefined,
    dueFrom: sp.due_from,
    dueTo: sp.due_to,
    periodYear: sp.period_year ? parseInt(sp.period_year, 10) : undefined,
    periodMonth: sp.period_month ? parseInt(sp.period_month, 10) : undefined,
    isBillable: triState(sp.is_billable),
    isStuck: triState(sp.is_stuck),
    isVerified: triState(sp.is_verified),
    verificationStatus: sp.verification || undefined,
    labels,
    q: sp.q,
  };
}
