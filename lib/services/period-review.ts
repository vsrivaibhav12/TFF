// Pure: checks a stored task period against what its sub-service declares.
import { parsePeriodKey, periodFromInput, subServicePeriodType, type PeriodInput, type PeriodType } from '@/lib/periods';

export type PeriodReview = {
  /** ok: fits. confirm: stored before financial-year periods, needs a person to confirm. mismatch: does not fit. */
  status: 'ok' | 'confirm' | 'mismatch';
  reason?: string;
  suggestedKey?: string;
};

const CONCRETE: PeriodType[] = ['monthly', 'quarterly'];

export function reviewTaskPeriod(
  task: PeriodInput,
  sub: { period_type?: string | null; frequency?: string | null },
): PeriodReview {
  const declared = subServicePeriodType(sub);
  // A GST service is monthly or quarterly depending on the client; either is acceptable here.
  const acceptable: PeriodType[] = declared === 'gst_frequency' ? CONCRETE : [declared];

  if (task.period_key) {
    const parsed = parsePeriodKey(task.period_key);
    if (!parsed) return { status: 'mismatch', reason: 'The stored period key is not valid' };
    if (acceptable.includes(parsed.type)) return { status: 'ok' };
    if (declared === 'none') return { status: 'mismatch', reason: 'This service does not use a period' };
    return { status: 'mismatch', reason: `Stored as ${parsed.type.replace('_', '-')}, but the service is ${acceptable.join(' or ').replace('_', '-')}` };
  }

  const hasAny = !!(task.period_year || task.period_month || task.period_quarter);
  if (declared === 'none') {
    return hasAny ? { status: 'mismatch', reason: 'This service does not use a period' } : { status: 'ok' };
  }

  for (const type of acceptable) {
    const r = periodFromInput(type, {
      period_year: task.period_year,
      period_month: task.period_month,
      period_quarter: task.period_quarter,
    });
    if (!r.ok) continue;
    // Months and years are unambiguous; quarters and years may have been calendar-based.
    if (type === 'monthly') return { status: 'ok' };
    return {
      status: 'confirm',
      reason: 'Stored before financial-year periods. Confirm the period.',
      suggestedKey: r.period.key ?? undefined,
    };
  }
  return { status: 'mismatch', reason: hasAny ? 'The stored period does not fit this service' : 'This service needs a period' };
}
