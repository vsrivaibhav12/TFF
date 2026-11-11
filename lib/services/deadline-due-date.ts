// Pure: what is the statutory due date for a sub-service in a given period?
// Order: an admin's override, then a compliance rule linked to the sub-service, then the sub-service's own due day.
import { periodEndIso, type Period, type PeriodType } from '@/lib/periods';
import {
  generateEventsForRule,
  type CalendarRule,
  type ClientProfile,
} from '@/lib/services/compliance-calendar-engine';

export type DeadlineSubService = {
  id: string;
  code: string;
  name: string;
  frequency: string;
  due_day_of_month: number | null;
  due_day_of_quarter: number | null;
  due_month: number | null;
};

export type DeadlineDueDate = {
  dueDate: string | null;
  source: 'override' | 'rule' | 'sub_service' | 'none';
};

// Rule predicates decide which clients a rule applies to, not when it is due, so they are ignored here.
const NEUTRAL_PROFILE: ClientProfile = {
  client_id: '',
  is_audit_applicable: false,
  is_tds_deductor: false,
  is_tcs_collector: false,
  is_advance_tax_applicable: false,
  is_pf_applicable: false,
  is_esi_applicable: false,
  is_pt_applicable: false,
  is_roc_applicable: false,
  is_transfer_pricing: false,
  fy_start_month: 4,
};

const PERIODICITY: Record<PeriodType, CalendarRule['periodicity'] | null> = {
  none: null,
  monthly: 'monthly',
  quarterly: 'quarterly',
  half_yearly: 'half_yearly',
  yearly: 'yearly',
};

/** The rules of a sub-service that describe this kind of period (a GST service can have monthly and quarterly rules). */
export function rulesForPeriod(rules: CalendarRule[] | undefined | null, period: Period): CalendarRule[] {
  const wanted = PERIODICITY[period.type];
  return wanted ? (rules ?? []).filter((r) => r.periodicity === wanted) : [];
}

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * The due date a sub-service sets for itself, with no rule. Returns are filed after the period ends,
 * so the date falls in the month after a month, quarter or half-year, and in the next calendar year
 * (default July) for a financial year.
 */
function subServiceDueDate(period: Period, sub: DeadlineSubService): string | null {
  const end = periodEndIso(period);
  if (!end) return null;
  const [endY, endM] = end.split('-').map(Number);

  if (period.type === 'yearly') {
    if (sub.due_month === null && sub.due_day_of_month === null) return null;
    const month = sub.due_month ?? 7;
    const year = (period.year as number) + 1;
    return `${year}-${pad(month)}-${pad(Math.min(sub.due_day_of_month ?? lastDay(year, month), lastDay(year, month)))}`;
  }

  const day = period.type === 'quarterly' ? (sub.due_day_of_quarter ?? sub.due_day_of_month) : sub.due_day_of_month;
  if (day === null || day === undefined) return null;
  const month = endM === 12 ? 1 : endM + 1;
  const year = endM === 12 ? endY + 1 : endY;
  return `${year}-${pad(month)}-${pad(Math.min(day, lastDay(year, month)))}`;
}

export function resolveDeadlineDueDate(args: {
  period: Period;
  rules?: CalendarRule[] | null;
  subService?: DeadlineSubService | null;
  override?: string | null;
}): DeadlineDueDate {
  if (args.override) return { dueDate: args.override, source: 'override' };
  if (!args.period.key || args.period.year === null) return { dueDate: null, source: 'none' };

  // The engine walks whole years from the window's edges, so the window must start in the period's own year
  // (the financial-year start year for quarterly, half-yearly and yearly periods) and run two years on.
  const from = `${args.period.year}-01-01`;
  const to = `${args.period.year + 1}-12-31`;

  for (const rule of rulesForPeriod(args.rules, args.period)) {
    const hit = generateEventsForRule(rule, NEUTRAL_PROFILE, from, to, { ignorePredicates: true })
      .find((e) => e.period_key === args.period.key);
    if (hit) return { dueDate: hit.due_date, source: 'rule' };
  }

  if (args.subService) {
    const date = subServiceDueDate(args.period, args.subService);
    if (date) return { dueDate: date, source: 'sub_service' };
  }

  return { dueDate: null, source: 'none' };
}
