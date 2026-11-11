// Pure: turns "what the user picked" into the stored period columns and the task title.
import {
  periodFromInput,
  periodToColumns,
  resolveTaskPeriodType,
  subServicePeriodType,
  type Period,
  type PeriodColumns,
  type PeriodInput,
} from '@/lib/periods';
import { buildTaskTitle } from '@/lib/utils';

export type PeriodContext = {
  subService: { name: string; frequency?: string | null; period_type?: string | null } | null;
  clientName: string | null;
  gstFrequency: string | null;
};

export type ResolvedTaskPeriod =
  | { ok: true; period: Period | null; columns: PeriodColumns | null; title: string | null }
  | { ok: false; reason: string };

/**
 * Check a period against the task's sub-service and build what gets stored.
 * A task with no sub-service has nothing to check against, so its period is left as given.
 */
export function resolveTaskPeriod(ctx: PeriodContext, input: PeriodInput): ResolvedTaskPeriod {
  if (!ctx.subService) return { ok: true, period: null, columns: null, title: null };

  const type = resolveTaskPeriodType(subServicePeriodType(ctx.subService), ctx.gstFrequency);
  const r = periodFromInput(type, input);
  if (!r.ok) return { ok: false, reason: r.reason };

  return {
    ok: true,
    period: r.period,
    columns: periodToColumns(r.period),
    title: buildTaskTitle({
      subServiceName: ctx.subService.name,
      clientName: ctx.clientName ?? undefined,
      periodKey: r.period.key,
    }),
  };
}

/**
 * What a task's stored period counts as when only its service changes. Older monthly tasks are exact.
 * Older quarterly and yearly tasks used calendar quarters and years, so they are not carried over:
 * the person chooses the period again.
 */
export function storedPeriodInput(task: {
  period_key?: string | null;
  period_year?: number | null;
  period_month?: number | null;
  period_quarter?: number | null;
}): PeriodInput {
  if (task.period_key) return { period_key: task.period_key };
  if (task.period_year && task.period_month && !task.period_quarter) {
    return { period_year: task.period_year, period_month: task.period_month };
  }
  return {};
}
