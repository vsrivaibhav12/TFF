'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import * as workDoneRepo from '@/lib/repositories/work-done';
import { canModifyTask } from '@/lib/services/task-modify-guard';

const workDoneSchema = z.object({
  task_id: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  work_date: z.string(),
  duration_minutes: z.number().int().positive().max(1440),
  note: z.string().min(1),
  started_at: z.string().optional().nullable(),
  ended_at: z.string().optional().nullable(),
});

export async function addWorkDoneAction(input: z.infer<typeof workDoneSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.complete');
    const parsed = workDoneSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');

    await workDoneRepo.addWorkDoneRecord({
      ...parsed.data,
      user_id: me.id,
      entry_method: 'manual',
    });

    revalidatePath('/team/work-done');
    revalidatePath('/admin/work-done');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const manualSchema = z.object({
  task_id: z.string().uuid(),
  work_date: z.string(),
  duration_minutes: z.number().int().positive().max(1440),
  note: z.string().max(500).optional().nullable(),
});

export async function addManualWorkDoneAction(input: any): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.complete');
    const parsed = manualSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { data: task } = await sb.from('tasks').select('client_id, status, is_deleted').eq('id', parsed.data.task_id).maybeSingle();
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task as any)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');
    const { data, error } = await sb
      .from('task_workdone')
      .insert({
        task_id: parsed.data.task_id,
        user_id: me.id,
        client_id: (task as any).client_id,
        work_date: parsed.data.work_date,
        duration_minutes: parsed.data.duration_minutes,
        note: parsed.data.note ?? null,
        entry_method: 'manual',
      })
      .select('id')
      .single();
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const timerSchema = z.object({
  task_id: z.string().uuid(),
  started_at: z.string(),
  ended_at: z.string(),
  note: z.string().max(500).optional().nullable(),
});

export async function logTimerWorkDoneAction(input: any): Promise<ActionResult<{ id: string; duration_minutes: number }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.complete');
    const parsed = timerSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const start = new Date(parsed.data.started_at);
    const end = new Date(parsed.data.ended_at);
    const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    if (minutes > 1440) return fail('Timer duration exceeds 24 hours — split into multiple entries', 'VALIDATION');
    const sb = createClient();
    const { data: task } = await sb.from('tasks').select('client_id, status, is_deleted').eq('id', parsed.data.task_id).maybeSingle();
    if (!task) return fail('Task not found', 'NOT_FOUND');
    if (!canModifyTask(task as any)) return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');
    const { data, error } = await sb
      .from('task_workdone')
      .insert({
        task_id: parsed.data.task_id,
        user_id: me.id,
        client_id: (task as any).client_id,
        work_date: start.toISOString().slice(0, 10),
        duration_minutes: minutes,
        note: parsed.data.note ?? null,
        entry_method: 'timer',
        started_at: parsed.data.started_at,
        ended_at: parsed.data.ended_at,
      })
      .select('id')
      .single();
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/team/tasks/${parsed.data.task_id}`);
    return ok({ id: data.id, duration_minutes: minutes });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteWorkDoneAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.complete');
    const sb = createClient();
    const { data: row } = await sb.from('task_workdone').select('user_id, task_id').eq('id', id).maybeSingle();
    if (!row) return fail('Not found', 'NOT_FOUND');
    if (me.role !== 'admin' && (row as any).user_id !== me.id) {
      return fail('You can only delete your own entries', 'FORBIDDEN');
    }
    if ((row as any).task_id) {
      const { data: task } = await sb.from('tasks').select('status, is_deleted').eq('id', (row as any).task_id).maybeSingle();
      if (task && !canModifyTask(task as any)) {
        return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');
      }
    }
    const { error } = await sb.from('task_workdone').delete().eq('id', id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/team/work-done');
    revalidatePath('/admin/work-done');
    revalidatePath(`/team/tasks/${(row as any).task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const updateWorkDoneSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid().optional().nullable(),
  task_id: z.string().uuid().optional().nullable(),
  work_date: z.string(),
  duration_minutes: z.number().int().positive().max(1440),
  note: z.string().min(1),
  started_at: z.string().optional().nullable(),
  ended_at: z.string().optional().nullable(),
});

export async function updateWorkDoneAction(input: z.infer<typeof updateWorkDoneSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.complete');
    const parsed = updateWorkDoneSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');

    const sb = createClient();
    const { data: row } = await sb.from('task_workdone').select('user_id, task_id').eq('id', parsed.data.id).maybeSingle();
    if (!row) return fail('Not found', 'NOT_FOUND');
    if (me.role !== 'admin' && (row as any).user_id !== me.id) {
      return fail('You can only edit your own entries', 'FORBIDDEN');
    }
    if ((row as any).task_id) {
      const { data: task } = await sb.from('tasks').select('status, is_deleted').eq('id', (row as any).task_id).maybeSingle();
      if (task && !canModifyTask(task as any)) {
        return fail('Completed or deleted tasks cannot be modified', 'IMMUTABLE');
      }
    }

    const { error } = await sb.from('task_workdone').update({
      client_id: parsed.data.client_id ?? null,
      task_id: parsed.data.task_id ?? null,
      work_date: parsed.data.work_date,
      duration_minutes: parsed.data.duration_minutes,
      note: parsed.data.note,
      started_at: parsed.data.started_at ?? null,
      ended_at: parsed.data.ended_at ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', parsed.data.id);

    if (error) return fail(error.message, 'DB');
    revalidatePath('/team/work-done');
    revalidatePath('/admin/work-done');
    revalidatePath(`/team/tasks/${(row as any).task_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
