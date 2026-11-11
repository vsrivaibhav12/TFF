// Orchestrates creating the tasks of one deadline. Data access is injected so the rules can be tested.
import { periodToColumns } from '@/lib/periods';
import { buildTaskTitle } from '@/lib/utils';
import type { CalendarRule } from '@/lib/services/compliance-calendar-engine';
import type { DeadlineSubService } from '@/lib/services/deadline-due-date';
import { buildDeadlinePlan, type DeadlinePlan, type PlanClientInput } from '@/lib/services/deadline-plan';

export type CreateRowsArgs = {
  sub_service_id: string;
  period_key: string;
  period_type: string;
  period_year: number | null;
  period_month: number | null;
  period_quarter: number | null;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  rows: Array<{ client_id: string; assigned_to: string; title: string }>;
};

export type CreateRowsResult = {
  created: Array<{ client_id: string; task_id: string; task_number: string }>;
  failed: Array<{ client_id: string; reason: string }>;
};

export type CreateDeps = {
  subService: DeadlineSubService & { period_type?: string | null };
  rules: CalendarRule[];
  override: string | null;
  /** Today's date (YYYY-MM-DD). A task cannot be due before the day it is created. */
  todayIso: string;
  listClients: () => Promise<PlanClientInput[]>;
  createRows: (args: CreateRowsArgs) => Promise<CreateRowsResult>;
};

export type DeadlineCreateInput = {
  sub_service_id: string;
  period_key: string;
  /** The date to put on the tasks. Defaults to the deadline's date. */
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  rows: Array<{ client_id: string; assigned_to: string | null }>;
};

export type DeadlineCreateSummary = {
  created: Array<{ client_id: string; client_name: string; task_number: string }>;
  skipped: Array<{ client_id: string; client_name: string; reason: string }>;
  failed: Array<{ client_id: string; client_name: string | null; reason: string }>;
  plan: DeadlinePlan;
};

export type DeadlineCreateResult = { ok: true; result: DeadlineCreateSummary } | { ok: false; reason: string };

export async function createDeadlineTasks(deps: CreateDeps, input: DeadlineCreateInput): Promise<DeadlineCreateResult> {
  const clients = await deps.listClients();
  const planned = buildDeadlinePlan({
    subService: deps.subService,
    periodKey: input.period_key,
    rules: deps.rules,
    override: deps.override,
    clients,
  });
  if (!planned.ok) return { ok: false, reason: planned.reason };
  const { plan } = planned;

  let dueDate = input.due_date || plan.due.dueDate;
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { ok: false, reason: 'Set a due date for this deadline' };
  }
  if (input.due_date && input.due_date < deps.todayIso) {
    return { ok: false, reason: 'Choose today or a later date for the tasks' };
  }
  // The statutory date may already have passed; the tasks are then due today.
  if (dueDate < deps.todayIso) dueDate = deps.todayIso;

  const byId = new Map(plan.clients.map((c) => [c.client_id, c]));
  const summary: DeadlineCreateSummary = { created: [], skipped: [], failed: [], plan };
  const toCreate: CreateRowsArgs['rows'] = [];

  for (const row of input.rows) {
    const c = byId.get(row.client_id);
    if (!c) {
      summary.failed.push({ client_id: row.client_id, client_name: null, reason: 'This client is not linked to the service' });
      continue;
    }
    if (c.status === 'exists') {
      summary.skipped.push({ client_id: c.client_id, client_name: c.business_name, reason: 'This client already has a task for this period' });
      continue;
    }
    if (c.status === 'not_applicable') {
      summary.skipped.push({ client_id: c.client_id, client_name: c.business_name, reason: c.reason ?? 'Not applicable' });
      continue;
    }
    if (!row.assigned_to) {
      summary.failed.push({ client_id: c.client_id, client_name: c.business_name, reason: 'Choose someone to assign' });
      continue;
    }
    toCreate.push({
      client_id: c.client_id,
      assigned_to: row.assigned_to,
      title: buildTaskTitle({ subServiceName: deps.subService.name, clientName: c.business_name, periodKey: input.period_key }),
    });
  }

  if (toCreate.length > 0) {
    const cols = periodToColumns(plan.period);
    const res = await deps.createRows({
      sub_service_id: input.sub_service_id,
      period_key: input.period_key,
      period_type: cols.period_type,
      period_year: cols.period_year,
      period_month: cols.period_month,
      period_quarter: cols.period_quarter,
      due_date: dueDate,
      priority: input.priority,
      rows: toCreate,
    });
    for (const x of res.created) {
      summary.created.push({ client_id: x.client_id, client_name: byId.get(x.client_id)?.business_name ?? '', task_number: x.task_number });
    }
    for (const x of res.failed) {
      summary.failed.push({ client_id: x.client_id, client_name: byId.get(x.client_id)?.business_name ?? null, reason: x.reason });
    }
  }

  return { ok: true, result: summary };
}
