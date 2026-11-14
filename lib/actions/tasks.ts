'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { createTaskSchema, transitionTaskSchema, updateTaskBillingSchema, updateTaskArnSchema, reopenTaskSchema, type CreateTaskInput, type TaskStatus } from '@/lib/validation/schemas';
import * as taskService from '@/lib/services/task-service';
import { canModifyTask, canCompleteTask, canEditTaskFields } from '@/lib/services/task-modify-guard';
import { diffFields } from '@/lib/services/field-diff';
import { auditClosedTaskEdit } from '@/lib/services/task-edit-audit';
import { resolveTaskPeriod, storedPeriodInput } from '@/lib/services/task-period';
import { getTaskPeriodContext } from '@/lib/repositories/periods';
import * as taskRepo from '@/lib/repositories/tasks';
import { ensureClientSubServiceLink } from '@/lib/repositories/client-sub-services';
import { createClient } from '@/lib/supabase/server';
import { seedTaskStepsFromSop, seedTaskStepsFromTemplate } from '@/lib/services/task-steps-service';
import { writeAudit } from '@/lib/services/audit-service';
import { hasCapabilities } from '@/lib/auth/capabilities-cache';
import { listTeamUsers } from '@/lib/repositories/clients';
import { parseTaskFilterParams } from '@/lib/tasks/filter-params';
import { buildTaskTitle } from '@/lib/utils';
import type { SupabaseClient } from '@supabase/supabase-js';

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'unknown';
}
function errorCode(e: unknown): string {
  return (e as { code?: string })?.code ?? 'UNKNOWN';
}

export async function createTaskAction(input: CreateTaskInput): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.create');
    
    const parsed = createTaskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    
    // The period must fit what the sub-service declares (none, monthly, quarterly, ...).
    const periodCtx = await getTaskPeriodContext(parsed.data.sub_service_id, parsed.data.client_id);
    const resolvedPeriod = resolveTaskPeriod(periodCtx, {
      period_key: parsed.data.period_key,
      period_year: parsed.data.period_year,
      period_month: parsed.data.period_month,
      period_quarter: parsed.data.period_quarter,
    });
    if (!resolvedPeriod.ok) return fail(resolvedPeriod.reason, 'VALIDATION');
    const { period_key: _ignoredKey, ...taskFields } = parsed.data;

    // Inherit is_billable from sub-service if linked
    let isBillable = parsed.data.is_billable ?? false;
    if (parsed.data.sub_service_id) {
      const sb = createClient();
      const { data: sub } = await sb
        .from('sub_services')
        .select('is_billable')
        .eq('id', parsed.data.sub_service_id)
        .maybeSingle();
      if (sub && sub.is_billable !== null) {
        isBillable = sub.is_billable;
      }
    }
    
    // Tasks may be created for any sub-service. Link it to the client here, on the
    // server, so creating a task never depends on the separate services.assign right.
    if (parsed.data.sub_service_id && parsed.data.client_id) {
      try {
        await ensureClientSubServiceLink(parsed.data.client_id, parsed.data.sub_service_id);
      } catch (linkErr) {
        console.error('[createTaskAction] could not link sub-service to client', linkErr);
      }
    }

    const data = await taskRepo.createTaskWithAutoNumber({
      ...taskFields,
      ...(resolvedPeriod.columns ?? {}),
      title: resolvedPeriod.title ?? parsed.data.title,
      status: 'pending',
      is_billable: isBillable,
      bill_amount: null,
      bill_reference: null,
    });
    
    await taskRepo.addTaskActivity({
      task_id: data.id,
      action: 'created',
      field_name: 'status',
      new_value: 'pending',
      changed_by: me.id,
    });
    
    // If linked to a task template, copy its steps onto the new task
    if (parsed.data.task_template_id) {
      try {
        const sb = createClient();
        await seedTaskStepsFromTemplate(sb as unknown as SupabaseClient, { task_id: data.id, task_template_id: parsed.data.task_template_id });
      } catch (seedErr) {
        // Non-critical for creation, but never silent: the checklist can be loaded later.
        console.error('[createTaskAction] template step seeding failed', seedErr);
      }
    } else if (parsed.data.sub_service_id) {
      // Auto-load SOP steps if no specific template is chosen
      try {
        const sb = createClient();
        await seedTaskStepsFromSop(sb as unknown as SupabaseClient, { task_id: data.id, sub_service_id: parsed.data.sub_service_id });
      } catch (seedErr) {
        console.error('[createTaskAction] SOP step seeding failed', seedErr);
      }
    }
    
    await writeAudit({ action: 'task.create', entity_type: 'task', entity_id: data.id, performed_by: me.id, details: { client_id: parsed.data.client_id, title: parsed.data.title } });
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    revalidatePath(`/team/clients/${parsed.data.client_id}`);
    revalidatePath(`/admin/clients/${parsed.data.client_id}`);
    return ok({ id: data.id });
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

export async function transitionTaskAction(input: { task_id: string; to_status: TaskStatus; note?: string; arn_reference?: string | null; is_arn_client_visible?: boolean; bill_reference?: string | null; bill_amount?: number | null }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.complete');
    const parsed = transitionTaskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    
    const task = await taskRepo.getTask(parsed.data.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task, parsed.data.to_status)) {
      return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');
    }
    if (parsed.data.to_status === 'completed') {
      const check = canCompleteTask(task, {
        bill_reference: parsed.data.bill_reference ?? undefined,
        bill_amount: parsed.data.bill_amount ?? undefined,
      });
      if (!check.ok) return fail(check.reason, 'BILLING_REQUIRED');
    }
    
    await taskService.transitionTaskStatus({
      taskId: parsed.data.task_id,
      toStatus: parsed.data.to_status,
      performedBy: me.id,
      note: parsed.data.note,
      arnReference: parsed.data.arn_reference ?? undefined,
      isArnClientVisible: parsed.data.is_arn_client_visible ?? undefined,
      billReference: parsed.data.bill_reference ?? undefined,
      billAmount: parsed.data.bill_amount ?? undefined,
    });
    
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/admin/tasks/${parsed.data.task_id}`);
    return ok(undefined);
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

export async function addTaskNoteAction(input: { task_id: string; body: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.edit');
    if (!input.body || input.body.trim().length < 1) return fail('Note cannot be empty', 'VALIDATION');
    
    await taskService.addTaskNote(input.task_id, input.body.trim(), me.id);
    await writeAudit({ action: 'task.add_note', entity_type: 'task', entity_id: input.task_id, performed_by: me.id });
    revalidatePath(`/team/tasks/${input.task_id}`);
    revalidatePath(`/admin/tasks/${input.task_id}`);
    return ok(undefined);
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

export async function assignTaskAction(input: { task_id: string; assigned_to?: string | string[] | null; reviewer_id?: string | string[] | null }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');

    const task = await taskRepo.getTask(input.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');

    const assigneeIds = input.assigned_to
      ? (Array.isArray(input.assigned_to) ? input.assigned_to : [input.assigned_to]).filter(Boolean)
      : [];
    const reviewerIds = input.reviewer_id
      ? (Array.isArray(input.reviewer_id) ? input.reviewer_id : [input.reviewer_id]).filter(Boolean)
      : [];

    await taskRepo.updateTaskRecord(input.task_id, {
      assigned_to: assigneeIds[0] || null,
      reviewer_id: reviewerIds[0] || null,
      updated_at: new Date().toISOString(),
    });
    await taskRepo.setTaskAssignees(input.task_id, assigneeIds, reviewerIds, me.id);

    await taskRepo.addTaskActivity({
      task_id: input.task_id,
      action: 'assignment_changed',
      field_name: 'assignment',
      new_value: `assignees=${assigneeIds.join(',') || '-'} reviewers=${reviewerIds.join(',') || '-'}`,
      changed_by: me.id,
    });
    await writeAudit({ action: 'task.assign', entity_type: 'task', entity_id: input.task_id, performed_by: me.id, details: { assigned_to: assigneeIds, reviewer_id: reviewerIds } });
    revalidatePath(`/team/tasks/${input.task_id}`);
    revalidatePath(`/admin/tasks/${input.task_id}`);
    return ok(undefined);
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

export async function updateTaskLabelsAction(taskId: string, labels: string[]): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.edit');
    const task = await taskRepo.getTask(taskId);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    const check = canEditTaskFields(task, ['labels'], { isAdmin: me.role === 'admin' });
    if (!check.ok) return fail(check.reason, check.code);

    const sb = createClient();
    // Remove existing labels
    await sb.from('task_label_assignments').delete().eq('task_id', taskId);
    // Insert new labels
    if (labels.length > 0) {
      const { error } = await sb.from('task_label_assignments').insert(
        labels.map((code) => ({ task_id: taskId, label_code: code }))
      );
      if (error) return fail(error.message, 'DB');
    }

    await taskRepo.addTaskActivity({
      task_id: taskId,
      action: 'labels_updated',
      field_name: 'labels',
      new_value: labels.join(', '),
      changed_by: me.id,
    });
    await writeAudit({ action: 'task.update_labels', entity_type: 'task', entity_id: taskId, performed_by: me.id, details: { labels } });
    revalidatePath(`/team/tasks/${taskId}`);
    revalidatePath(`/admin/tasks/${taskId}`);
    return ok(undefined);
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

export async function updateTaskCustomFieldsAction(taskId: string, fields: Record<string, unknown>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'manage_custom_fields');
    const task = await taskRepo.getTask(taskId);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    const check = canEditTaskFields(task, ['custom_fields'], { isAdmin: me.role === 'admin' });
    if (!check.ok) return fail(check.reason, check.code);

    const sb = createClient();
    for (const [definitionId, value] of Object.entries(fields)) {
      let valueText: string | null = null;
      let valueNumber: number | null = null;
      let valueDate: string | null = null;
      let valueBool: boolean | null = null;

      if (value === null || value === undefined) {
        // Skip null values — they mean "clear this field"
        await sb.from('task_custom_field_values').delete().eq('task_id', taskId).eq('definition_id', definitionId);
        continue;
      }

      const t = typeof value;
      if (t === 'boolean') valueBool = value as boolean;
      else if (t === 'number') valueNumber = value as number;
      else if (t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value as string)) valueDate = value as string;
      else valueText = String(value);

      const { error } = await sb.from('task_custom_field_values').upsert({
        task_id: taskId,
        definition_id: definitionId,
        value_text: valueText,
        value_number: valueNumber,
        value_date: valueDate,
        value_bool: valueBool,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'task_id,definition_id' });
      if (error) return fail(error.message, 'DB');
    }

    await taskRepo.addTaskActivity({
      task_id: taskId,
      action: 'custom_fields_updated',
      field_name: 'custom_fields',
      new_value: JSON.stringify(fields),
      changed_by: me.id,
    });

    revalidatePath(`/team/tasks/${taskId}`);
    revalidatePath(`/admin/tasks/${taskId}`);
    return ok(undefined);
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}



export async function softDeleteTaskAction(taskId: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.delete');
    await taskRepo.softDeleteTaskRecord(taskId, me.id);
    await writeAudit({ action: 'task.delete', entity_type: 'task', entity_id: taskId, performed_by: me.id });
    revalidatePath('/admin/tasks');
    revalidatePath('/team/tasks');
    return ok(undefined);
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

export async function bulkDeleteTasksAction(taskIds: string[]): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.delete');
    
    if (!taskIds || taskIds.length === 0) {
      return fail('No tasks selected', 'VALIDATION');
    }
    
    await Promise.all(taskIds.map(id => taskRepo.softDeleteTaskRecord(id, me.id)));
    await writeAudit({ action: 'task.bulk_delete', entity_type: 'task', performed_by: me.id, details: { count: taskIds.length, ids: taskIds } });
    revalidatePath('/admin/tasks');
    revalidatePath('/team/tasks');
    return ok(undefined);
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

export async function updateTaskBillingAction(input: { task_id: string; is_billable: boolean; bill_reference?: string | null; bill_amount?: number | null }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.edit');
    const parsed = updateTaskBillingSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    
    const task = await taskRepo.getTask(parsed.data.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    const check = canEditTaskFields(task, ['is_billable', 'bill_reference', 'bill_amount'], { isAdmin: me.role === 'admin' });
    if (!check.ok) return fail(check.reason, check.code);

    const billingUpdate = {
      is_billable: parsed.data.is_billable,
      bill_reference: parsed.data.bill_reference || null,
      bill_amount: parsed.data.bill_amount ?? null,
    };
    await taskRepo.updateTaskRecord(parsed.data.task_id, {
      ...billingUpdate,
      updated_at: new Date().toISOString(),
    });
    await auditClosedTaskEdit({
      task,
      performedBy: me.id,
      fields: diffFields(task as unknown as Record<string, unknown>, billingUpdate, Object.keys(billingUpdate)),
    });

    await taskRepo.addTaskActivity({
      task_id: parsed.data.task_id,
      action: 'billing_updated',
      field_name: 'is_billable',
      new_value: `${parsed.data.is_billable}${parsed.data.bill_reference ? ` / ${parsed.data.bill_reference}` : ''}${parsed.data.bill_amount ? ` / ₹${parsed.data.bill_amount}` : ''}`,
      changed_by: me.id,
    });
    
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/admin/tasks/${parsed.data.task_id}`);
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    return ok(undefined);
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

export async function markTaskBilledAction(taskId: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.edit');
    const task = await taskRepo.getTask(taskId);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!task.is_billable) {
      return fail('Task is not billable', 'INVALID_STATE');
    }
    await taskRepo.updateTaskRecord(taskId, {
      billed: true,
      billed_date: (await import('@/lib/utils')).todayIST(),
      updated_at: new Date().toISOString(),
    });
    await taskRepo.addTaskActivity({
      task_id: taskId,
      action: 'marked_billed',
      field_name: 'billed',
      new_value: 'true',
      changed_by: me.id,
    });
    revalidatePath(`/team/tasks/${taskId}`);
    revalidatePath(`/admin/tasks/${taskId}`);
    revalidatePath('/admin/billing');
    return ok(undefined);
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

export async function updateTaskArnAction(input: { task_id: string; arn_reference?: string | null; is_arn_client_visible?: boolean }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.edit');
    const parsed = updateTaskArnSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    
    const task = await taskRepo.getTask(parsed.data.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    const check = canEditTaskFields(task, ['arn_reference', 'is_arn_client_visible'], { isAdmin: me.role === 'admin' });
    if (!check.ok) return fail(check.reason, check.code);

    const arnUpdate = {
      arn_reference: parsed.data.arn_reference || null,
      is_arn_client_visible: parsed.data.is_arn_client_visible ?? false,
    };
    await taskRepo.updateTaskRecord(parsed.data.task_id, {
      ...arnUpdate,
      updated_at: new Date().toISOString(),
    });
    await auditClosedTaskEdit({
      task,
      performedBy: me.id,
      fields: diffFields(task as unknown as Record<string, unknown>, arnUpdate, Object.keys(arnUpdate)),
    });

    await taskRepo.addTaskActivity({
      task_id: parsed.data.task_id,
      action: 'arn_updated',
      field_name: 'arn_reference',
      new_value: `${parsed.data.arn_reference || 'cleared'}${parsed.data.is_arn_client_visible ? ' (client visible)' : ''}`,
      changed_by: me.id,
    });
    
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/admin/tasks/${parsed.data.task_id}`);
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    return ok(undefined);
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

export async function reopenTaskAction(input: { task_id: string; reason: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.edit');
    const parsed = reopenTaskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    
    const task = await taskRepo.getTask(parsed.data.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (task.is_deleted) {
      return fail('Deleted tasks cannot be reopened', 'IMMUTABLE');
    }
    if (task.status !== 'completed') {
      return fail('Only completed tasks can be reopened', 'INVALID_STATE');
    }
    
    await taskRepo.updateTaskRecord(parsed.data.task_id, {
      status: 'in_progress',
      completed_date: null,
      verification_status: 'not_required',
      is_verified: false,
      verified_by_user_id: null,
      verified_at: null,
      updated_at: new Date().toISOString(),
    });
    
    await taskRepo.addTaskActivity({
      task_id: parsed.data.task_id,
      action: 'task_reopened',
      field_name: 'status',
      old_value: 'completed',
      new_value: `in_progress (reason: ${parsed.data.reason})`,
      changed_by: me.id,
    });
    
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    revalidatePath(`/admin/tasks/${parsed.data.task_id}`);
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    return ok(undefined);
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}


const bulkUpdateTasksSchema = z.object({
  task_ids: z.array(z.string().uuid()).min(1),
  updates: z.object({
    assigned_to: z.string().uuid().optional().nullable(),
    reviewer_id: z.string().uuid().optional().nullable(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    due_date: z.string().date().optional(),
    is_billable: z.boolean().optional(),
  }).refine(data => Object.keys(data).length > 0, 'At least one field to update must be provided'),
});

export async function bulkUpdateTasksAction(input: z.infer<typeof bulkUpdateTasksSchema>): Promise<ActionResult<{ success: number; failed: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.edit');
    const parsed = bulkUpdateTasksSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    // Changing who owns or reviews a task needs the assign capability, same as the single-task action.
    if ('assigned_to' in parsed.data.updates || 'reviewer_id' in parsed.data.updates) {
      await requireCapability(me, 'tasks.assign');
    }

    let successCount = 0;
    let failedCount = 0;
    
    // We update one by one to ensure we don't bypass any logic checks, though we could do a direct SQL UPDATE if performance requires.
    // For a few dozen tasks, this loop is fine.
    for (const taskId of parsed.data.task_ids) {
      const task = await taskRepo.getTask(taskId);
      if (!task || !canModifyTask(task)) {
        failedCount++;
        continue;
      }
      
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if ('assigned_to' in parsed.data.updates) payload.assigned_to = parsed.data.updates.assigned_to;
      if ('reviewer_id' in parsed.data.updates) payload.reviewer_id = parsed.data.updates.reviewer_id;
      if ('priority' in parsed.data.updates) payload.priority = parsed.data.updates.priority;
      if ('due_date' in parsed.data.updates) payload.due_date = parsed.data.updates.due_date;
      if ('is_billable' in parsed.data.updates) payload.is_billable = parsed.data.updates.is_billable;

      try {
        await taskRepo.updateTaskRecord(taskId, payload);
        // Keep the assignee list in step with the column, as the single-task assign does.
        // Without this the task shows one owner in the list and another in the detail view.
        if ('assigned_to' in parsed.data.updates) {
          await taskRepo.setTaskRoleUser(taskId, 'assignee', parsed.data.updates.assigned_to ?? null, me.id);
        }
        if ('reviewer_id' in parsed.data.updates) {
          await taskRepo.setTaskRoleUser(taskId, 'reviewer', parsed.data.updates.reviewer_id ?? null, me.id);
        }
        successCount++;

        await taskRepo.addTaskActivity({
          task_id: taskId,
          action: 'bulk_updated',
          field_name: Object.keys(parsed.data.updates).join(', '),
          new_value: 'updated via bulk action',
          changed_by: me.id,
        });
      } catch (e) {
        failedCount++;
      }
    }

    await writeAudit({ action: 'task.bulk_update', entity_type: 'task', performed_by: me.id, details: { count: successCount, fields: Object.keys(parsed.data.updates) } });
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    return ok({ success: successCount, failed: failedCount });
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

const REASSIGN_CAP = 500;

const reassignByFilterSchema = z.object({
  filters: z.object({
    status: z.string().optional(), priority: z.string().optional(), assigned: z.string().optional(),
    client: z.string().optional(), sub_service: z.string().optional(), due_from: z.string().optional(),
    due_to: z.string().optional(), period_year: z.string().optional(), period_month: z.string().optional(),
    is_billable: z.string().optional(), is_stuck: z.string().optional(), is_verified: z.string().optional(),
    label: z.union([z.string(), z.array(z.string())]).optional(), q: z.string().optional(),
  }),
  assigned_to: z.string().uuid().nullable(),
  /** The count the user saw on screen. The action refuses if the matching set has changed. */
  expected_count: z.number().int().min(1).max(REASSIGN_CAP),
});

/**
 * Reassign every task matching the current list filter, not just the selected rows.
 * Safeguards: needs tasks.assign, refuses above 500 tasks, refuses if the number of
 * matches differs from what the user confirmed, skips completed and cancelled tasks.
 */
export async function reassignTasksByFilterAction(
  input: z.infer<typeof reassignByFilterSchema>,
): Promise<ActionResult<{ updated: number; skipped: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');
    const parsed = reassignByFilterSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');

    // Same scoping as the list page: without tasks.view a team member only sees their own tasks.
    const caps = await hasCapabilities(me, ['tasks.view']);
    const canViewAll = me.role === 'admin' || caps.has('tasks.view');
    const opts = parseTaskFilterParams(parsed.data.filters);
    if (!canViewAll) opts.assignedTo = opts.assignedTo ?? me.id;

    if (parsed.data.assigned_to) {
      const team = await listTeamUsers();
      if (!team.some((m: { id: string }) => m.id === parsed.data.assigned_to)) return fail('Choose an active team member', 'VALIDATION');
    }

    const { ids, truncated } = await taskRepo.listTaskIdsForFilter(opts, REASSIGN_CAP);
    if (truncated) return fail(`More than ${REASSIGN_CAP} tasks match. Narrow the filter first.`, 'TOO_MANY');
    if (ids.length !== parsed.data.expected_count) {
      return fail('The matching tasks changed since you opened this. Refresh and try again.', 'CONFLICT');
    }

    const updatedIds = await taskRepo.reassignTasks(ids, parsed.data.assigned_to, me.id);
    await writeAudit({
      action: 'task.bulk_reassign',
      entity_type: 'task',
      performed_by: me.id,
      details: { assigned_to: parsed.data.assigned_to, matched: ids.length, updated: updatedIds.length, filters: parsed.data.filters },
    });
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    return ok({ updated: updatedIds.length, skipped: ids.length - updatedIds.length });
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

const updateTaskSchema = z.object({
  task_id: z.string().uuid(),
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z.string().date().optional().nullable(),
  period_year: z.number().int().min(2000).max(2100).optional().nullable(),
  period_month: z.number().int().min(1).max(12).optional().nullable(),
  period_quarter: z.number().int().min(1).max(4).optional().nullable(),
  period_key: z.string().max(20).optional().nullable(),
  sub_service_id: z.string().uuid().optional().nullable(),
  task_template_id: z.string().uuid().optional().nullable(),
  arn_reference: z.string().max(100).optional().nullable(),
  bill_reference: z.string().max(100).optional().nullable(),
  bill_amount: z.number().optional().nullable(),
  is_billable: z.boolean().optional(),
  is_arn_client_visible: z.boolean().optional(),
});

export async function updateTaskAction(input: z.infer<typeof updateTaskSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.edit');
    const parsed = updateTaskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');

    const { task_id, ...updates } = parsed.data;
    const task = await taskRepo.getTask(task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    const editCheck = canEditTaskFields(task, Object.keys(updates), { isAdmin: me.role === 'admin' });
    if (!editCheck.ok) return fail(editCheck.reason, editCheck.code);
    const wasCompleted = task.status === 'completed';

    const sb = createClient();

    // Validate that a chosen task template belongs to the effective sub-service.
    const effectiveSubServiceId = updates.sub_service_id !== undefined ? updates.sub_service_id : task.sub_service_id;
    if (updates.task_template_id) {
      const { data: tmpl } = await sb.from('task_templates')
        .select('id, sub_service_id')
        .eq('id', updates.task_template_id)
        .eq('is_deleted', false)
        .eq('is_active', true)
        .maybeSingle();
      if (!tmpl) return fail('Selected template not found or inactive', 'NOT_FOUND');
      if (tmpl.sub_service_id !== effectiveSubServiceId) {
        return fail('Selected template does not belong to this sub-service', 'VALIDATION');
      }
    }

    // Period: it must fit the sub-service's period type. The uniform columns and the title are
    // rebuilt from it. A title typed by the user in the same request wins over the generated one.
    const userTypedTitle = updates.title !== undefined;
    const periodTouched = (['period_year', 'period_month', 'period_quarter', 'period_key'] as const)
      .some((k) => updates[k] !== undefined);
    const subServiceTouched = updates.sub_service_id !== undefined;
    if ((periodTouched || subServiceTouched) && effectiveSubServiceId) {
      const periodCtx = await getTaskPeriodContext(effectiveSubServiceId, task.client_id as string);
      // A picked key is the whole truth. Otherwise combine the new columns with the stored ones.
      const periodInput = updates.period_key !== undefined
        ? { period_key: updates.period_key }
        : periodTouched
          ? {
              period_key: null,
              period_year: updates.period_year !== undefined ? updates.period_year : task.period_year,
              period_month: updates.period_month !== undefined ? updates.period_month : task.period_month,
              period_quarter: updates.period_quarter !== undefined ? updates.period_quarter : task.period_quarter,
            }
          : storedPeriodInput(task);
      const resolvedPeriod = resolveTaskPeriod(periodCtx, periodInput);
      if (!resolvedPeriod.ok) return fail(resolvedPeriod.reason, 'VALIDATION');
      if (resolvedPeriod.columns) Object.assign(updates, resolvedPeriod.columns);
      if (!userTypedTitle && resolvedPeriod.title) updates.title = resolvedPeriod.title;
    }

    // Inherit the billable flag from a newly chosen sub-service unless the user set it explicitly.
    if (subServiceTouched && updates.sub_service_id && updates.is_billable === undefined) {
      const { data: sub } = await sb.from('sub_services').select('is_billable').eq('id', updates.sub_service_id).maybeSingle();
      if (sub && sub.is_billable !== null) updates.is_billable = sub.is_billable;
    }

    // A task with no sub-service has no period type to check; keep its title consistent as before.
    if (!effectiveSubServiceId && !userTypedTitle && updates.title === undefined && (periodTouched || subServiceTouched)) {
      updates.title = buildTaskTitle({
        subServiceName: task.sub_services?.name ?? task.title?.split(' — ')[0] ?? 'Task',
        clientName: task.clients?.business_name ?? undefined,
        periodYear: updates.period_year ?? task.period_year ?? null,
        periodMonth: updates.period_month ?? task.period_month ?? null,
        periodQuarter: updates.period_quarter ?? task.period_quarter ?? null,
      });
    }

    // Choosing a sub-service on an existing task links it to the client if needed.
    const subServiceChanged = !!updates.sub_service_id && updates.sub_service_id !== task.sub_service_id;
    if (subServiceChanged && task.client_id) {
      await ensureClientSubServiceLink(task.client_id, updates.sub_service_id as string);
    }

    await taskRepo.updateTaskRecord(task_id, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (wasCompleted) {
      await writeAudit({
        action: 'task.update_closed',
        entity_type: 'task',
        entity_id: task_id,
        performed_by: me.id,
        details: { fields: diffFields(task as unknown as Record<string, unknown>, { ...task, ...updates } as unknown as Record<string, unknown>, Object.keys(updates)) },
      });
    }

    // A task that has no checklist yet gets the new sub-service's SOP steps. Completed tasks keep their checklist as it was.
    if (subServiceChanged && !wasCompleted && !updates.task_template_id) {
      try {
        const { count } = await sb.from('task_steps').select('id', { count: 'exact', head: true }).eq('task_id', task_id);
        if (!count) {
          await seedTaskStepsFromSop(sb as unknown as SupabaseClient, { task_id, sub_service_id: updates.sub_service_id as string });
        }
      } catch (seedErr) {
        console.error('[updateTaskAction] SOP step seeding failed', seedErr);
      }
    }

    // Revalidate the task list pages (the [id] routes are only redirects and
    // should not be revalidated directly).
    revalidatePath('/admin/tasks');
    revalidatePath('/team/tasks');
    revalidatePath(`/admin/tasks/${task_id}`);
    revalidatePath(`/team/tasks/${task_id}`);
    return ok(undefined);
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}


export async function loadTemplateStepsAction(input: { task_id: string; task_template_id: string }): Promise<ActionResult<{ count: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.create');

    const task = await taskRepo.getTask(input.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');

    const sb = createClient();
    const count = await seedTaskStepsFromTemplate(sb as unknown as SupabaseClient, { task_id: input.task_id, task_template_id: input.task_template_id });

    revalidatePath(`/team/tasks/${input.task_id}`);
    revalidatePath(`/admin/tasks/${input.task_id}`);
    return ok({ count });
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}

export async function loadSopStepsAction(input: { task_id: string; sub_service_id: string }): Promise<ActionResult<{ count: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.create');

    const task = await taskRepo.getTask(input.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');

    const sb = createClient();
    const count = await seedTaskStepsFromSop(sb as unknown as SupabaseClient, { task_id: input.task_id, sub_service_id: input.sub_service_id });

    revalidatePath(`/team/tasks/${input.task_id}`);
    revalidatePath(`/admin/tasks/${input.task_id}`);
    return ok({ count });
  } catch (e: unknown) {
    return fail(errorMessage(e), errorCode(e));
  }
}
