'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { writeAudit } from '@/lib/services/audit-service';
import { notify } from '@/lib/services/notification-service';
import { formatPeriod, parsePeriodKey } from '@/lib/periods';
import { buildDeadlinePlan, type PlanClientStatus } from '@/lib/services/deadline-plan';
import { createDeadlineTasks } from '@/lib/services/deadline-create';
import { resolveDeadlineDueDate } from '@/lib/services/deadline-due-date';
import {
  createDeadlineRowsRpc,
  getDeadlineOverride,
  getRuleForSubService,
  getSubServiceForDeadline,
  listDeadlineClientsRpc,
  listOpenDeadlineTasks,
  setDefaultAssignee,
  setEventDueDates,
  setTasksDueDate,
  upsertDeadlineOverride,
} from '@/lib/repositories/deadlines';

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : typeof (e as { message?: unknown })?.message === 'string' ? (e as { message: string }).message : 'Something went wrong';
}
function errorCode(e: unknown): string {
  return (e as { code?: string })?.code ?? 'UNKNOWN';
}

export type DeadlinePlanDTO = {
  period_key: string;
  period_label: string;
  due_date: string | null;
  due_source: 'override' | 'rule' | 'sub_service' | 'none';
  original_due_date: string | null;
  extension_note: string | null;
  counts: { linked: number; applicable: number; exists: number; ready: number; notApplicable: number };
  clients: Array<{
    client_id: string;
    business_name: string;
    group_name: string | null;
    default_assignee_id: string | null;
    status: PlanClientStatus;
    reason?: string;
  }>;
};

const planSchema = z.object({
  sub_service_id: z.string().uuid(),
  period_key: z.string().min(4).max(20),
});

/** The linked clients of a deadline, and what can be done for each. */
export async function getDeadlinePlanAction(input: z.infer<typeof planSchema>): Promise<ActionResult<DeadlinePlanDTO>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'compliance.generate_tasks');
    const parsed = planSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');

    const sb = createClient();
    const [subService, rule, override] = await Promise.all([
      getSubServiceForDeadline(sb, parsed.data.sub_service_id),
      getRuleForSubService(sb, parsed.data.sub_service_id),
      getDeadlineOverride(sb, parsed.data.sub_service_id, parsed.data.period_key),
    ]);
    if (!subService) return fail('Service not found', 'NOT_FOUND');

    const clients = await listDeadlineClientsRpc(sb, parsed.data.sub_service_id, parsed.data.period_key);
    const planned = buildDeadlinePlan({
      subService,
      periodKey: parsed.data.period_key,
      rule,
      override: override?.due_date ?? null,
      clients,
    });
    if (!planned.ok) return fail(planned.reason, 'VALIDATION');
    const { plan } = planned;

    return ok({
      period_key: parsed.data.period_key,
      period_label: formatPeriod(plan.period),
      due_date: plan.due.dueDate,
      due_source: plan.due.source,
      original_due_date: override?.original_due_date ?? null,
      extension_note: override?.extension_note ?? null,
      counts: plan.counts,
      clients: plan.clients.map((c) => ({
        client_id: c.client_id,
        business_name: c.business_name,
        group_name: c.group_name,
        default_assignee_id: c.default_assignee_id,
        status: c.status,
        reason: c.reason,
      })),
    });
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

const createSchema = z.object({
  sub_service_id: z.string().uuid(),
  period_key: z.string().min(4).max(20),
  due_date: z.string().date().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  rows: z.array(z.object({ client_id: z.string().uuid(), assigned_to: z.string().uuid().nullable() })).min(1).max(2000),
  remember_defaults: z.boolean().optional(),
});

export type DeadlineCreateDTO = {
  created: Array<{ client_id: string; client_name: string; task_number: string }>;
  skipped: Array<{ client_id: string; client_name: string; reason: string }>;
  failed: Array<{ client_id: string; client_name: string | null; reason: string }>;
  defaults_saved: number;
};

/** Create the tasks for the chosen clients of a deadline, each with its own assignee. */
export async function createDeadlineTasksAction(input: z.infer<typeof createSchema>): Promise<ActionResult<DeadlineCreateDTO>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'compliance.generate_tasks');
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');

    const sb = createClient();
    const [subService, rule, override] = await Promise.all([
      getSubServiceForDeadline(sb, parsed.data.sub_service_id),
      getRuleForSubService(sb, parsed.data.sub_service_id),
      getDeadlineOverride(sb, parsed.data.sub_service_id, parsed.data.period_key),
    ]);
    if (!subService) return fail('Service not found', 'NOT_FOUND');

    const r = await createDeadlineTasks(
      {
        subService,
        rule,
        override: override?.due_date ?? null,
        listClients: () => listDeadlineClientsRpc(sb, parsed.data.sub_service_id, parsed.data.period_key),
        createRows: (args) => createDeadlineRowsRpc(sb, args),
      },
      {
        sub_service_id: parsed.data.sub_service_id,
        period_key: parsed.data.period_key,
        due_date: parsed.data.due_date,
        priority: parsed.data.priority,
        rows: parsed.data.rows,
      },
    );
    if (!r.ok) return fail(r.reason, 'VALIDATION');

    // Optionally remember the chosen people as each client's default for next time.
    let defaultsSaved = 0;
    if (parsed.data.remember_defaults && r.result.created.length > 0) {
      const chosen = new Map(parsed.data.rows.map((x) => [x.client_id, x.assigned_to]));
      for (const c of r.result.created) {
        try {
          defaultsSaved += await setDefaultAssignee(sb, c.client_id, parsed.data.sub_service_id, chosen.get(c.client_id) ?? null);
        } catch {
          // Saving a default is a convenience; the tasks are already created.
        }
      }
    }

    revalidatePath('/admin/tasks');
    revalidatePath('/team/tasks');
    revalidatePath('/admin/compliance');
    return ok({ created: r.result.created, skipped: r.result.skipped, failed: r.result.failed, defaults_saved: defaultsSaved });
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

const extensionSchema = z.object({
  sub_service_id: z.string().uuid(),
  period_key: z.string().min(4).max(20),
  due_date: z.string().date(),
  note: z.string().max(300).optional().nullable(),
  move_open_tasks: z.boolean().default(true),
});

/** Change the due date of a deadline (for example a government extension) for every client at once. */
export async function changeDeadlineDueDateAction(
  input: z.infer<typeof extensionSchema>,
): Promise<ActionResult<{ events_updated: boolean; tasks_moved: number; tasks_open: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'compliance.generate_tasks');
    const parsed = extensionSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const period = parsePeriodKey(parsed.data.period_key);
    if (!period) return fail('That period is not valid', 'VALIDATION');

    const sb = createClient();
    const [subService, rule] = await Promise.all([
      getSubServiceForDeadline(sb, parsed.data.sub_service_id),
      getRuleForSubService(sb, parsed.data.sub_service_id),
    ]);
    if (!subService) return fail('Service not found', 'NOT_FOUND');

    const original = resolveDeadlineDueDate({ period, rule, subService });
    await upsertDeadlineOverride(sb, {
      sub_service_id: parsed.data.sub_service_id,
      period_key: parsed.data.period_key,
      due_date: parsed.data.due_date,
      original_due_date: original.dueDate,
      note: parsed.data.note ?? null,
      user_id: me.id,
    });
    await setEventDueDates(sb, parsed.data.sub_service_id, parsed.data.period_key, parsed.data.due_date);

    let tasksMoved = 0;
    let tasksOpen = 0;
    if (parsed.data.move_open_tasks) {
      const open = await listOpenDeadlineTasks(sb, parsed.data.sub_service_id, parsed.data.period_key);
      tasksOpen = open.length;
      if (open.length > 0) {
        tasksMoved = await setTasksDueDate(sb, open.map((t) => t.id), parsed.data.due_date);
        const assignees = Array.from(new Set(open.map((t) => t.assigned_to).filter((x): x is string => !!x)));
        for (const userId of assignees) {
          try {
            await notify({
              user_id: userId,
              type: 'compliance_due',
              title: 'Due date changed',
              message: `${subService.name}, ${formatPeriod(period)}: the due date is now ${parsed.data.due_date}.`,
              related_entity_type: 'sub_service',
              related_entity_id: parsed.data.sub_service_id,
            });
          } catch {
            // A failed notification must not undo the date change.
          }
        }
      }
    }

    await writeAudit({
      action: 'compliance.deadline_changed',
      entity_type: 'sub_service',
      entity_id: parsed.data.sub_service_id,
      performed_by: me.id,
      details: {
        period_key: parsed.data.period_key,
        from: original.dueDate,
        to: parsed.data.due_date,
        note: parsed.data.note ?? null,
        tasks_moved: tasksMoved,
      },
    });
    revalidatePath('/admin/tasks');
    revalidatePath('/team/tasks');
    revalidatePath('/admin/compliance');
    return ok({ events_updated: true, tasks_moved: tasksMoved, tasks_open: tasksOpen });
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

const defaultAssigneeSchema = z.object({
  client_id: z.string().uuid(),
  sub_service_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
});

/** Set who gets this client's tasks for a service by default. */
export async function setDefaultAssigneeAction(input: z.infer<typeof defaultAssigneeSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.assign');
    const parsed = defaultAssigneeSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const changed = await setDefaultAssignee(sb, parsed.data.client_id, parsed.data.sub_service_id, parsed.data.user_id);
    if (changed === 0) return fail('That service is not linked to this client, or you do not have access', 'NOT_FOUND');
    revalidatePath(`/admin/clients/${parsed.data.client_id}`);
    return ok(undefined);
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}
