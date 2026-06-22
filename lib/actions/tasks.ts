'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { createTaskSchema, transitionTaskSchema, updateTaskBillingSchema, updateTaskArnSchema, reopenTaskSchema, type CreateTaskInput, type TaskStatus } from '@/lib/validation/schemas';
import * as taskService from '@/lib/services/task-service';
import { canModifyTask, canCompleteTask } from '@/lib/services/task-modify-guard';
import * as taskRepo from '@/lib/repositories/tasks';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { seedTaskStepsFromSop, seedTaskStepsFromTemplate } from '@/lib/services/task-steps-service';
import { notify } from '@/lib/services/notification-service';
import { writeAudit } from '@/lib/services/audit-service';
import { buildTaskTitle } from '@/lib/utils';

export async function createTaskAction(input: CreateTaskInput): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.create');
    
    const parsed = createTaskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    
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
    
    const data = await taskRepo.createTaskWithAutoNumber({
      ...parsed.data,
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
        await seedTaskStepsFromTemplate(sb as any, { task_id: data.id, task_template_id: parsed.data.task_template_id });
      } catch {
        // Non-critical: template step seeding failure does not block task creation
      }
    } else if (parsed.data.sub_service_id) {
      // Auto-load SOP steps if no specific template is chosen
      try {
        const sb = createClient();
        await seedTaskStepsFromSop(sb as any, { task_id: data.id, sub_service_id: parsed.data.sub_service_id });
      } catch {
        // Non-critical: SOP step seeding failure does not block task creation
      }
    }
    
    await writeAudit({ action: 'task.create', entity_type: 'task', entity_id: data.id, performed_by: me.id, details: { client_id: parsed.data.client_id, title: parsed.data.title } });
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    revalidatePath('/portal/tasks');
    revalidatePath(`/team/clients/${parsed.data.client_id}`);
    revalidatePath(`/admin/clients/${parsed.data.client_id}`);
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function transitionTaskAction(input: { task_id: string; to_status: TaskStatus; note?: string; arn_reference?: string | null; is_arn_client_visible?: boolean; bill_reference?: string | null; bill_amount?: number | null }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team', 'client']);
    if (me.role !== 'client') await requireCapability(me, 'tasks.complete');
    const parsed = transitionTaskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    
    const task = await taskRepo.getTask(parsed.data.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task as any, parsed.data.to_status)) {
      return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');
    }
    if (parsed.data.to_status === 'completed') {
      const check = canCompleteTask(task as any, {
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
    revalidatePath('/portal/tasks');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function addTaskNoteAction(input: { task_id: string; body: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team', 'client']);
    if (me.role !== 'client') await requireCapability(me, 'tasks.edit');
    if (!input.body || input.body.trim().length < 1) return fail('Note cannot be empty', 'VALIDATION');
    
    await taskService.addTaskNote(input.task_id, input.body.trim(), me.id);
    await writeAudit({ action: 'task.add_note', entity_type: 'task', entity_id: input.task_id, performed_by: me.id });
    revalidatePath(`/team/tasks/${input.task_id}`);
    revalidatePath(`/admin/tasks/${input.task_id}`);
    revalidatePath(`/portal/tasks/${input.task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function assignTaskAction(input: { task_id: string; assigned_to?: string | string[] | null; reviewer_id?: string | string[] | null }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');

    const task = await taskRepo.getTask(input.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task as any)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');

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
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function sendTaskReminderAction(input: { task_id: string; message?: string }): Promise<ActionResult<{ recipients: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.assign');
    if (!input.task_id) return fail('task_id is required', 'VALIDATION');
    
    const task = await taskRepo.getTask(input.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!(task as any).is_blocked_on_client) {
      return fail('Reminders can only be sent for tasks waiting on the client', 'INVALID_STATE');
    }

    // Throttle: refuse if a reminder activity exists within the last 6h
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    
    // Manual query for activity check
    const sb = createClient();
    const { data: recent } = await sb
      .from('task_activity')
      .select('id, created_at')
      .eq('task_id', input.task_id)
      .eq('action', 'reminder_sent')
      .gte('created_at', sixHoursAgo)
      .limit(1);
      
    if (recent && recent.length > 0) {
      return fail('A reminder was already sent in the last 6 hours', 'THROTTLED');
    }

    // Find client portal users for this client
    const { data: clientUsers } = await sb
      .from('client_users')
      .select('user_id')
      .eq('client_id', (task as any).client_id)
      .eq('is_active', true);

    const userIds = (clientUsers ?? []).map((u: any) => u.user_id).filter(Boolean);
    const subject = `Reminder: ${(task as any).title}`;
    const body = input.message?.trim()
      || `We're waiting on inputs for "${(task as any).title}". Please respond at your earliest convenience.`;

    for (const uid of userIds) {
      await notify({
        user_id: uid,
        type: 'task_due_soon',
        title: subject,
        message: body,
        related_entity_type: 'task',
        related_entity_id: input.task_id,
        immediate: true,
      });
    }

    await taskRepo.addTaskActivity({
      task_id: input.task_id,
      action: 'reminder_sent',
      field_name: 'reminder',
      new_value: `${userIds.length} recipient${userIds.length === 1 ? '' : 's'}`,
      changed_by: me.id,
    });

    revalidatePath(`/team/tasks/${input.task_id}`);
    revalidatePath(`/admin/tasks/${input.task_id}`);
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    return ok({ recipients: userIds.length });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function updateTaskLabelsAction(taskId: string, labels: string[]): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.edit');
    const task = await taskRepo.getTask(taskId);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task as any)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');

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
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function updateTaskCustomFieldsAction(taskId: string, fields: Record<string, any>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'manage_custom_fields');
    const task = await taskRepo.getTask(taskId);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task as any)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');

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
      if (t === 'boolean') valueBool = value;
      else if (t === 'number') valueNumber = value;
      else if (t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) valueDate = value;
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
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
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
    revalidatePath('/portal/tasks');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
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
    revalidatePath('/portal/tasks');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
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
    if ((task as any).is_deleted) {
      return fail('Deleted tasks cannot be modified', 'IMMUTABLE');
    }
    
    await taskRepo.updateTaskRecord(parsed.data.task_id, {
      is_billable: parsed.data.is_billable,
      bill_reference: parsed.data.bill_reference || null,
      bill_amount: parsed.data.bill_amount ?? null,
      updated_at: new Date().toISOString(),
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
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function markTaskBilledAction(taskId: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.edit');
    const task = await taskRepo.getTask(taskId);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!(task as any).is_billable) {
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
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
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
    if ((task as any).is_deleted) {
      return fail('Deleted tasks cannot be modified', 'IMMUTABLE');
    }
    
    await taskRepo.updateTaskRecord(parsed.data.task_id, {
      arn_reference: parsed.data.arn_reference || null,
      is_arn_client_visible: parsed.data.is_arn_client_visible ?? false,
      updated_at: new Date().toISOString(),
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
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
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
    if ((task as any).is_deleted) {
      return fail('Deleted tasks cannot be reopened', 'IMMUTABLE');
    }
    if ((task as any).status !== 'completed') {
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
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}


const bulkCreateTasksSchema = z.object({
  client_ids: z.array(z.string().uuid()).min(1),
  sub_service_id: z.string().uuid(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().date(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  period_year: z.number().int().min(2000).max(2100),
  period_month: z.number().int().min(1).max(12).optional().nullable(),
  period_quarter: z.number().int().min(1).max(4).optional().nullable(),
});

export async function bulkCreateTasksAction(input: z.infer<typeof bulkCreateTasksSchema>): Promise<ActionResult<{ created: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.create');
    const parsed = bulkCreateTasksSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');

    const sb = createClient();

    // Fetch sub-service details for naming and is_billable
    const { data: subService } = await sb
      .from('sub_services')
      .select('name, is_billable')
      .eq('id', parsed.data.sub_service_id)
      .maybeSingle();

    let created = 0;
    for (const clientId of parsed.data.client_ids) {
      const { data: client } = await sb
        .from('clients')
        .select('business_name')
        .eq('id', clientId)
        .maybeSingle();

      const title = buildTaskTitle({
        subServiceName: subService?.name ?? 'Task',
        clientName: client?.business_name,
        periodYear: parsed.data.period_year,
        periodMonth: parsed.data.period_month,
        periodQuarter: parsed.data.period_quarter,
      });

      try {
        await taskRepo.createTaskWithAutoNumber({
          client_id: clientId,
          sub_service_id: parsed.data.sub_service_id,
          title,
          description: '',
          priority: parsed.data.priority,
          assigned_to: parsed.data.assigned_to,
          due_date: parsed.data.due_date,
          period_year: parsed.data.period_year,
          period_month: parsed.data.period_month,
          period_quarter: parsed.data.period_quarter,
          status: 'pending',
          is_billable: subService?.is_billable ?? false,
          bill_amount: null,
          bill_reference: null,
        });
        created++;
      } catch {
        // Non-critical: individual client failure does not block bulk creation
      }
    }

    await writeAudit({ action: 'task.bulk_create', entity_type: 'task', performed_by: me.id, details: { created, sub_service_id: parsed.data.sub_service_id } });
    revalidatePath('/team/tasks');
    revalidatePath('/admin/tasks');
    revalidatePath('/portal/tasks');
    return ok({ created });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
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

    let successCount = 0;
    let failedCount = 0;
    
    // We update one by one to ensure we don't bypass any logic checks, though we could do a direct SQL UPDATE if performance requires.
    // For a few dozen tasks, this loop is fine.
    for (const taskId of parsed.data.task_ids) {
      const task = await taskRepo.getTask(taskId);
      if (!task || !canModifyTask(task as any)) {
        failedCount++;
        continue;
      }
      
      const payload: any = { updated_at: new Date().toISOString() };
      if ('assigned_to' in parsed.data.updates) payload.assigned_to = parsed.data.updates.assigned_to;
      if ('reviewer_id' in parsed.data.updates) payload.reviewer_id = parsed.data.updates.reviewer_id;
      if ('priority' in parsed.data.updates) payload.priority = parsed.data.updates.priority;
      if ('due_date' in parsed.data.updates) payload.due_date = parsed.data.updates.due_date;
      if ('is_billable' in parsed.data.updates) payload.is_billable = parsed.data.updates.is_billable;

      try {
        await taskRepo.updateTaskRecord(taskId, payload);
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
    revalidatePath('/portal/tasks');
    return ok({ success: successCount, failed: failedCount });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
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
    const me = await requireRole(['admin', 'team', 'client']);
    if (me.role !== 'client') await requireCapability(me, 'tasks.edit');
    const parsed = updateTaskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');

    const { task_id, ...updates } = parsed.data;
    const task = await taskRepo.getTask(task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task as any)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');

    const sb = createClient();

    // Validate that a chosen task template belongs to the effective sub-service.
    const effectiveSubServiceId = updates.sub_service_id !== undefined ? updates.sub_service_id : (task as any).sub_service_id;
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

    // Regenerate title if sub-service or period changes so the stored title stays consistent.
    const titleNeedsRegen =
      updates.sub_service_id !== undefined ||
      updates.period_year !== undefined ||
      updates.period_month !== undefined ||
      updates.period_quarter !== undefined;
    if (titleNeedsRegen) {
      const subServiceId = updates.sub_service_id ?? (task as any).sub_service_id;
      let subServiceName = (task as any).sub_services?.name ?? (task as any).title?.split(' — ')[0] ?? 'Task';
      if (subServiceId) {
        const { data: sub } = await sb.from('sub_services').select('name, is_billable').eq('id', subServiceId).maybeSingle();
        if (sub?.name) subServiceName = sub.name;
        // Inherit billable flag from the new sub-service unless the user explicitly set it.
        if (updates.sub_service_id !== undefined && updates.is_billable === undefined && sub && sub.is_billable !== null) {
          updates.is_billable = sub.is_billable;
        }
      }
      updates.title = buildTaskTitle({
        subServiceName,
        clientName: (task as any).clients?.business_name ?? undefined,
        periodYear: updates.period_year ?? (task as any).period_year ?? null,
        periodMonth: updates.period_month ?? (task as any).period_month ?? null,
        periodQuarter: updates.period_quarter ?? (task as any).period_quarter ?? null,
      });
    }

    await taskRepo.updateTaskRecord(task_id, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    revalidatePath(`/team/tasks/${task_id}`);
    revalidatePath(`/admin/tasks/${task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}


export async function loadTemplateStepsAction(input: { task_id: string; task_template_id: string }): Promise<ActionResult<{ count: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.create');

    const task = await taskRepo.getTask(input.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task as any)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');

    const sb = createClient();
    const count = await seedTaskStepsFromTemplate(sb as any, { task_id: input.task_id, task_template_id: input.task_template_id });

    revalidatePath(`/team/tasks/${input.task_id}`);
    revalidatePath(`/admin/tasks/${input.task_id}`);
    return ok({ count });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function loadSopStepsAction(input: { task_id: string; sub_service_id: string }): Promise<ActionResult<{ count: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.create');

    const task = await taskRepo.getTask(input.task_id);
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task as any)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');

    const sb = createClient();
    const count = await seedTaskStepsFromSop(sb as any, { task_id: input.task_id, sub_service_id: input.sub_service_id });

    revalidatePath(`/team/tasks/${input.task_id}`);
    revalidatePath(`/admin/tasks/${input.task_id}`);
    return ok({ count });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
