import type { TaskFilterOpts } from '@/lib/repositories/tasks';
import type { TaskStatus } from '@/lib/validation/schemas';

/** The raw URL query parameters the task list understands. */
export type TaskFilterParams = {
  status?: string; priority?: string; assigned?: string; client?: string; sub_service?: string;
  due_from?: string; due_to?: string; period_year?: string; period_month?: string;
  is_billable?: string; is_stuck?: string; is_verified?: string; label?: string | string[]; q?: string;
};

const triState = (v: string | undefined) => (v === 'true' ? true : v === 'false' ? false : undefined);

/**
 * Turn URL query parameters into repository filter options. Used by the list page and by
 * the "reassign all matching" action, so both always agree on which tasks match.
 */
export function parseTaskFilterParams(sp: TaskFilterParams): TaskFilterOpts {
  const labels = Array.isArray(sp.label) ? sp.label : sp.label ? [sp.label] : undefined;
  return {
    status: (sp.status?.split(',').filter(Boolean) ?? []) as Array<TaskStatus | 'blocked' | 'stuck'>,
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
    labels,
    q: sp.q,
  };
}
