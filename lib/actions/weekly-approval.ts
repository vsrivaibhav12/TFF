'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { notify } from '@/lib/services/notification-service';
import { getWeekBounds, computeWeekSummary } from '@/lib/repositories/weekly-approval';

const submitSchema = z.object({
  week_start: z.string().date(),
  week_end: z.string().date(),
});

export async function submitWeekForApprovalAction(input: z.infer<typeof submitSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    const parsed = submitSchema.safeParse(input);
    if (!parsed.success) return fail('Invalid input', 'VALIDATION');

    const sb = createClient();

    // Read manager_id
    const { data: profile } = await sb.from('users_profile').select('reports_to, full_name').eq('id', me.id).maybeSingle();
    const managerId = (profile as any)?.reports_to;

    // Compute summary from attendance logs
    const summary = await computeWeekSummary(me.id, parsed.data.week_start, parsed.data.week_end);

    const { error } = await sb.from('weekly_timesheet_submissions').upsert({
      user_id: me.id,
      manager_id: managerId ?? null,
      week_start: parsed.data.week_start,
      week_end: parsed.data.week_end,
      status: 'submitted',
      present_days: summary.present_days,
      leave_days: summary.leave_days,
      wfh_days: summary.wfh_days,
      half_days: summary.half_days,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' });

    if (error) return fail(error.message, 'DB');

    // Notify manager
    if (managerId) {
      await notify({
        user_id: managerId,
        type: 'team_alert',
        title: 'Weekly timesheet submitted',
        message: `${(profile as any)?.full_name ?? me.email} submitted their weekly timesheet (${parsed.data.week_start} to ${parsed.data.week_end}).`,
      });
    }

    // Also notify all admins (fallback if no manager or admin wants visibility)
    const { data: admins } = await sb.from('users_profile').select('id').eq('role', 'admin').eq('is_active', true);
    for (const a of admins ?? []) {
      if ((a as any).id === me.id || (a as any).id === managerId) continue;
      await notify({
        user_id: (a as any).id,
        type: 'team_alert',
        title: 'Weekly timesheet submitted',
        message: `${(profile as any)?.full_name ?? me.email} submitted their weekly timesheet (${parsed.data.week_start} to ${parsed.data.week_end}).`,
      });
    }

    revalidatePath('/team/attendance');
    revalidatePath('/team/approvals');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const reviewSchema = z.object({
  id: z.string().uuid(),
  approve: z.boolean(),
  remarks: z.string().optional(),
});

export async function reviewWeekAction(input: z.infer<typeof reviewSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'attendance.approve');
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) return fail('Invalid input', 'VALIDATION');

    const sb = createClient();
    const { data: row } = await sb.from('weekly_timesheet_submissions').select('user_id, week_start, week_end, status').eq('id', parsed.data.id).maybeSingle();
    if (!row) return fail('Not found', 'NOT_FOUND');
    if ((row as any).status !== 'submitted') {
      return fail(`This timesheet is already ${(row as any).status}`, 'ALREADY_REVIEWED');
    }

    const { error } = await sb.from('weekly_timesheet_submissions').update({
      status: parsed.data.approve ? 'approved' : 'rejected',
      approved_at: new Date().toISOString(),
      approved_by: me.id,
      review_remarks: parsed.data.remarks || null,
    }).eq('id', parsed.data.id);

    if (error) return fail(error.message, 'DB');

    await notify({
      user_id: (row as any).user_id,
      type: 'team_alert',
      title: `Weekly timesheet ${parsed.data.approve ? 'approved' : 'rejected'}`,
      message: `Your weekly timesheet (${(row as any).week_start} to ${(row as any).week_end}) was ${parsed.data.approve ? 'approved' : 'rejected'}.`,
    });

    revalidatePath('/team/attendance');
    revalidatePath('/team/approvals');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
