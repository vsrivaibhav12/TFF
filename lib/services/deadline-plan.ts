// Pure: for one deadline (sub-service + period), which linked clients can get a task, and which cannot.
import {
  parsePeriodKey,
  resolveTaskPeriodType,
  subServicePeriodType,
  type Period,
  type PeriodType,
} from '@/lib/periods';
import {
  generateEventsForRule,
  type CalendarRule,
  type ClientProfile,
} from '@/lib/services/compliance-calendar-engine';
import { resolveDeadlineDueDate, rulesForPeriod, type DeadlineDueDate, type DeadlineSubService } from '@/lib/services/deadline-due-date';

export type PlanClientInput = {
  client_id: string;
  business_name: string;
  group_name: string | null;
  default_assignee_id: string | null;
  gst_filing_frequency: string | null;
  /** The client's compliance profile. Without one, rule predicates cannot exclude the client. */
  profile: ClientProfile | null;
  existing_task_id: string | null;
};

export type PlanClientStatus = 'ready' | 'exists' | 'not_applicable';

export type PlanClient = PlanClientInput & { status: PlanClientStatus; reason?: string };

export type DeadlinePlan = {
  period: Period;
  due: DeadlineDueDate;
  clients: PlanClient[];
  counts: { linked: number; applicable: number; exists: number; ready: number; notApplicable: number };
};

export type DeadlinePlanResult = { ok: true; plan: DeadlinePlan } | { ok: false; reason: string };

const label = (t: PeriodType) => t.replace('_', '-');

export function buildDeadlinePlan(args: {
  subService: DeadlineSubService & { period_type?: string | null };
  periodKey: string;
  rules?: CalendarRule[];
  override?: string | null;
  clients: PlanClientInput[];
}): DeadlinePlanResult {
  const period = parsePeriodKey(args.periodKey);
  if (!period) return { ok: false, reason: 'That period is not valid' };

  const declared = subServicePeriodType(args.subService);
  if (declared === 'none') return { ok: false, reason: 'This service has no period, so it has no deadline' };

  // The period must be one this service can have, for at least one kind of client.
  const possible: PeriodType[] = declared === 'gst_frequency' ? ['monthly', 'quarterly'] : [declared];
  if (!possible.includes(period.type)) {
    return { ok: false, reason: `This service needs a ${possible.map(label).join(' or ')} period` };
  }

  const due = resolveDeadlineDueDate({
    period,
    rules: args.rules,
    subService: args.subService,
    override: args.override,
  });

  const matchingRules = rulesForPeriod(args.rules, period);
  const from = `${period.year}-01-01`;
  const to = `${(period.year as number) + 1}-12-31`;

  const clients: PlanClient[] = args.clients.map((c) => {
    if (c.existing_task_id) return { ...c, status: 'exists' as const };

    const clientType = resolveTaskPeriodType(declared, c.gst_filing_frequency);
    if (clientType !== period.type) {
      return { ...c, status: 'not_applicable' as const, reason: `Files ${label(clientType)}, not ${label(period.type)}` };
    }

    if (matchingRules.length > 0 && c.profile) {
      // A client is in if any rule of this kind covers it (a GST service can have one rule per filing frequency).
      const applies = matchingRules.some((r) => generateEventsForRule(r, c.profile as ClientProfile, from, to).some((e) => e.period_key === period.key));
      if (!applies) return { ...c, status: 'not_applicable' as const, reason: 'The compliance rule does not apply to this client' };
    }
    return { ...c, status: 'ready' as const };
  });

  const exists = clients.filter((c) => c.status === 'exists').length;
  const ready = clients.filter((c) => c.status === 'ready').length;
  const notApplicable = clients.filter((c) => c.status === 'not_applicable').length;

  return {
    ok: true,
    plan: {
      period,
      due,
      clients,
      counts: { linked: clients.length, applicable: exists + ready, exists, ready, notApplicable },
    },
  };
}
