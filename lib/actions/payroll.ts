'use server';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { runPayroll, type PayrollAdjustment } from '@/lib/services/payroll-service';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { writeAudit } from '@/lib/services/audit-service';
import { z } from 'zod';

export async function runPayrollAction(input: { user_id: string; year: number; month: number; total_working_days?: number; adjustments?: PayrollAdjustment[] }): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'payroll.run');

    const { id } = await runPayroll({ ...input, created_by: me.id });

    await writeAudit({
      action: 'payroll.run',
      entity_type: 'payroll_run',
      entity_id: id,
      performed_by: me.id,
      details: { user_id: input.user_id, month: input.month, year: input.year },
    });

    revalidatePath('/admin/payroll');
    return ok({ id });
  } catch (e: any) {
    if (e.message === 'NO_SETTINGS') return fail('No payroll settings for user', 'NO_SETTINGS');
    if (e.message === 'FINALIZED') return fail('This payroll run has been finalized and cannot be re-run. Revert to draft first.', 'FINALIZED');
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const settingsSchema = z.object({
  user_id: z.string().uuid(),
  monthly_salary: z.number().nonnegative(),
  paid_leaves_per_month: z.number().int().min(0).max(31),
  deduction_applicable: z.boolean().default(true),
  salary_adjustment_for_leaves: z.boolean().default(true),
  effective_from: z.string().optional().default(() => new Date().toISOString().slice(0, 10)),
});

export async function upsertPayrollSettingsAction(
  input: z.infer<typeof settingsSchema>
): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'payroll.run');
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');

    // Three-layer: action → service → repository
    const { upsertPayrollSettings } = await import('@/lib/repositories/payroll');
    await upsertPayrollSettings({
      user_id: parsed.data.user_id,
      monthly_salary: parsed.data.monthly_salary,
      paid_leaves_per_month: parsed.data.paid_leaves_per_month,
      deduction_applicable: parsed.data.deduction_applicable,
      salary_adjustment_for_leaves: parsed.data.salary_adjustment_for_leaves,
      effective_from: parsed.data.effective_from,
    });

    revalidatePath('/admin/payroll');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
