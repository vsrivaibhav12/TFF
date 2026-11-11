// Pure: what is the statutory due date for a sub-service in a given period?
// Order: an admin's override, then the compliance rule linked to the sub-service, then the sub-service's own due day.
import type { Period } from '@/lib/periods';
import {
  generateEventsForRule,
  generateSubServiceEvents,
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

export function resolveDeadlineDueDate(args: {
  period: Period;
  rule?: CalendarRule | null;
  subService?: DeadlineSubService | null;
  override?: string | null;
}): DeadlineDueDate {
  if (args.override) return { dueDate: args.override, source: 'override' };
  if (!args.period.key || args.period.year === null) return { dueDate: null, source: 'none' };

  // The engine walks whole years from the window's edges, so the window must start in the period's own year
  // (the financial-year start year for quarterly, half-yearly and yearly periods) and run two years on.
  const from = `${args.period.year}-01-01`;
  const to = `${args.period.year + 1}-12-31`;

  if (args.rule) {
    const hit = generateEventsForRule(args.rule, NEUTRAL_PROFILE, from, to, { ignorePredicates: true })
      .find((e) => e.period_key === args.period.key);
    if (hit) return { dueDate: hit.due_date, source: 'rule' };
  }

  if (args.subService) {
    const hit = generateSubServiceEvents(args.subService, '', from, to).find((e) => e.period_key === args.period.key);
    if (hit) return { dueDate: hit.due_date, source: 'sub_service' };
  }

  return { dueDate: null, source: 'none' };
}
