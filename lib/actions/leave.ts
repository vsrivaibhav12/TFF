'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { notify } from '@/lib/services/notification-service';
import { writeAudit } from '@/lib/services/audit-service';
import { todayIST } from '@/lib/utils';
import { checkRateLimit } from '@/lib/services/rate-limiter';
import * as leaveRepo from '@/lib/repositories/leave';

const leaveSchema = z.object({
  leave_type: z.enum(['paid', 'sick', 'casual', 'comp', 'other']),
  from_date: z.string(),
  to_date: z.string(),
  reason: z.string().optional(),
});

export async function requestLeaveAction(input: z.infer<typeof leaveSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    // R-3: Rate limit leave requests — max 10 per minute per user
    const rl = checkRateLimit(`leave:${me.id}`, 10);
    if (rl.limited) return fail('Too many requests. Please wait a moment and try again.', 'RATE_LIMITED');
    const parsed = leaveSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    if (parsed.data.to_date < parsed.data.from_date) {
      return fail('End date cannot be before start date', 'VALIDATION');
    }
    const today = todayIST();
    if (parsed.data.from_date < today) {
      return fail('Leave cannot be requested for past dates', 'PAST_DATE');
    }
    const days = Math.max(1, Math.round((new Date(parsed.data.to_date).getTime() - new Date(parsed.data.from_date).getTime()) / 86_400_000) + 1);
    // H-2: Use repository layer instead of direct DB access
    const data = await leaveRepo.createLeaveRequest({
      user_id: me.id,
      leave_type: parsed.data.leave_type,
      from_date: parsed.data.from_date,
      to_date: parsed.data.to_date,
      number_of_days: days,
      reason: parsed.data.reason,
      status: 'pending',
    });

    // Notify all admins globally
    const sb = createClient();
    const { data: admins } = await sb.from('users_profile').select('id').eq('role', 'admin').eq('is_active', true);
    for (const a of admins ?? []) {
      const admin = a as { id: string };
      if (admin.id === me.id) continue;
      await notify({
        user_id: admin.id,
        type: 'team_alert',
        title: 'Leave request',
        message: `${me.full_name ?? me.email} requested ${days} day(s) of ${parsed.data.leave_type} leave (${parsed.data.from_date} to ${parsed.data.to_date}).`,
        related_entity_type: 'leave_request',
        related_entity_id: data.id,
      });
    }

    revalidatePath('/team/leave');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function reviewLeaveAction(input: { id: string; approve: boolean; remarks?: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'leave.approve');
    const sb = createClient();
    // H-2: Use repository layer for DB access
    const row = await leaveRepo.getLeaveRequestById(input.id);
    if (!row) return fail('Not found', 'NOT_FOUND');
    // C-2: Prevent self-approval
    if (row.user_id === me.id && me.role !== 'admin') {
      return fail('You cannot approve or reject your own leave request', 'SELF_APPROVAL');
    }
    // Guard: only pending requests can be reviewed
    if (row.status !== 'pending') {
      return fail(`Leave request is already ${row.status}`, 'ALREADY_REVIEWED');
    }
    await leaveRepo.updateLeaveRequestStatus(input.id, {
      status: input.approve ? 'approved' : 'rejected',
      reviewed_by: me.id,
      reviewed_at: new Date().toISOString(),
      review_remarks: input.remarks,
    });
    await notify({
      user_id: (row as any).user_id,
      type: 'team_alert',
      title: `Leave ${input.approve ? 'approved' : 'rejected'}`,
      message: `Your leave request from ${(row as any).from_date} to ${(row as any).to_date} was ${input.approve ? 'approved' : 'rejected'}.`,
      related_entity_type: 'leave_request',
      related_entity_id: input.id,
    });
    // H-15: Audit log for leave approval decisions
    await writeAudit({
      action: input.approve ? 'leave.approved' : 'leave.rejected',
      entity_type: 'leave_request',
      entity_id: input.id,
      performed_by: me.id,
      details: { user_id: (row as any).user_id, from_date: (row as any).from_date, to_date: (row as any).to_date, remarks: input.remarks },
    });
    revalidatePath('/team/leave');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
