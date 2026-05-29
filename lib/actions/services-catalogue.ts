'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

// ---------- Service Category ----------
const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(60),
  description: z.string().max(255).optional(),
  display_order: z.number().int().optional().nullable(),
});
export async function upsertServiceCategoryAction(input: z.infer<typeof categorySchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.manage');
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { id, ...rest } = parsed.data;
    if (id) {
      const { error } = await sb.from('service_categories').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) return fail(error.message, 'DB');
      revalidatePath('/admin/services');
      return ok({ id });
    }
    const { data, error } = await sb.from('service_categories').insert(rest).select('id').single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/services');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteServiceCategoryAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.manage');
    const sb = createClient();
    // Soft delete: also uncategorise linked services
    await sb.from('services').update({ category_id: null }).eq('category_id', id);
    const { error } = await sb.from('service_categories').update({ is_deleted: true }).eq('id', id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/services');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

// ---------- Service ----------
const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  code: z.string().min(1).max(40).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, digits, underscore'),
  description: z.string().optional(),
  service_kind: z.enum(['gst', 'tds', 'income_tax', 'compliance', 'bizlens', 'vcfo', 'notice', 'payroll', 'other']).optional().nullable(),
});
export async function upsertServiceAction(input: z.infer<typeof serviceSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.manage');
    const parsed = serviceSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { id, ...rest } = parsed.data;
    if (id) {
      const { error } = await sb.from('services').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) return fail(error.message, 'DB');
      revalidatePath('/admin/services');
      return ok({ id });
    }
    const { data, error } = await sb.from('services').insert(rest).select('id').single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/services');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteServiceAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.manage');
    const sb = createClient();
    const { error } = await sb.from('services').update({ is_deleted: true }).eq('id', id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/services');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

// ---------- Sub-service ----------
const subServiceSchema = z.object({
  id: z.string().uuid().optional(),
  service_id: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().min(1).max(40),
  description: z.string().optional(),
  frequency: z.enum(['monthly', 'quarterly', 'annually', 'on_demand']),
  due_day_of_month: z.number().int().min(1).max(31).optional().nullable(),
  due_day_of_quarter: z.number().int().min(1).max(31).optional().nullable(),
  due_month: z.number().int().min(1).max(12).optional().nullable(),
  is_recurring: z.boolean().default(true),
  requires_client_input: z.boolean().default(true),
  requires_verification: z.boolean().default(false),
  is_active: z.boolean().default(true),
});
export async function upsertSubServiceAction(input: z.infer<typeof subServiceSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.manage');
    const parsed = subServiceSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { id, ...rest } = parsed.data;
    if (id) {
      const { error } = await sb.from('sub_services').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) return fail(error.message, 'DB');
      revalidatePath('/admin/services');
      return ok({ id });
    }
    const { data, error } = await sb.from('sub_services').insert(rest).select('id').single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/services');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteSubServiceAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.manage');
    const sb = createClient();
    const { error } = await sb.from('sub_services').update({ is_deleted: true, is_active: false }).eq('id', id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/services');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

// ---------- SOP steps ----------
const sopStepSchema = z.object({
  id: z.string().uuid().optional(),
  sub_service_id: z.string().uuid(),
  step_order: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  is_required: z.boolean().default(true),
});
export async function upsertSopStepAction(input: z.infer<typeof sopStepSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.manage');
    const parsed = sopStepSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { id, ...rest } = parsed.data;
    if (id) {
      const { error } = await sb.from('sub_service_sop_steps').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) return fail(error.message, 'DB');
      revalidatePath('/admin/services');
      return ok({ id });
    }
    // Check if this is the first SOP step for this sub-service ( triggers backfill )
    const { count: priorCount } = await sb
      .from('sub_service_sop_steps')
      .select('*', { count: 'exact', head: true })
      .eq('sub_service_id', rest.sub_service_id)
      .eq('is_deleted', false);
    const isFirstSopStep = (priorCount ?? 0) === 0;

    const { data, error } = await sb.from('sub_service_sop_steps').insert(rest).select('id').single();
    if (error) return fail(error.message, 'DB');

    if (isFirstSopStep) {
      // Backfill: find non-completed tasks with zero steps for this sub-service
      const { data: tasksToBackfill } = await sb
        .from('tasks')
        .select('id')
        .eq('sub_service_id', rest.sub_service_id)
        .not('status', 'in', '(completed,cancelled)');
      if (tasksToBackfill && tasksToBackfill.length > 0) {
        const taskIds = tasksToBackfill.map((t: any) => t.id);
        // Filter to only those with zero steps
        const { data: stepsData } = await sb
          .from('task_steps')
          .select('task_id')
          .in('task_id', taskIds);
        // Build a set of tasks that already have steps
        const tasksWithSteps = new Set((stepsData ?? []).map((s: any) => s.task_id));
        const tasksNeedingSteps = taskIds.filter((id: string) => !tasksWithSteps.has(id));
        if (tasksNeedingSteps.length > 0) {
          const { data: sopSteps } = await sb
            .from('sub_service_sop_steps')
            .select('id, step_order, title, description, is_required')
            .eq('sub_service_id', rest.sub_service_id)
            .eq('is_deleted', false)
            .order('step_order', { ascending: true });
          if (sopSteps && sopSteps.length > 0) {
            const rows = tasksNeedingSteps.flatMap((taskId: string) =>
              sopSteps.map((s: any) => ({
                task_id: taskId,
                step_order: s.step_order,
                title: s.title,
                description: s.description ?? null,
                is_required: s.is_required ?? true,
                source_sop_step_id: s.id,
              }))
            );
            await sb.from('task_steps').insert(rows);
          }
        }
      }
    }

    revalidatePath('/admin/services');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function deleteSopStepAction(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.manage');
    const sb = createClient();
    const { error } = await sb.from('sub_service_sop_steps').update({ is_deleted: true }).eq('id', id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/services');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function reorderSopStepsAction(input: { sub_service_id: string; ids_in_order: string[] }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'services.manage');
    const sb = createClient();
    // Two-pass to avoid unique-collision (sub_service_id, step_order)
    for (let i = 0; i < input.ids_in_order.length; i++) {
      await sb.from('sub_service_sop_steps').update({ step_order: 1000 + i }).eq('id', input.ids_in_order[i]);
    }
    for (let i = 0; i < input.ids_in_order.length; i++) {
      await sb.from('sub_service_sop_steps').update({ step_order: i + 1 }).eq('id', input.ids_in_order[i]);
    }
    revalidatePath('/admin/services');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
