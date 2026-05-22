'use server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { notify } from '@/lib/services/notification-service';

const requestSchema = z.object({
  request_date: z.string().date(),
  from_time: z.string().optional(),
  to_time: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export async function requestPermissionAction(input: z.infer<typeof requestSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    const parsed = requestSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();

    const { data, error } = await sb.from('permission_requests').insert({
      user_id: me.id,
      request_date: parsed.data.request_date,
      from_time: parsed.data.from_time || null,
      to_time: parsed.data.to_time || null,
      reason: parsed.data.reason || null,
    }).select('id').single();
    if (error) return fail(error.message, 'DB');

    // Notify all admins globally
    const { data: admins } = await sb.from('users_profile').select('id').eq('role', 'admin').eq('is_active', true);
    for (const a of admins ?? []) {
      if ((a as any).id === me.id) continue;
      await notify({
        user_id: (a as any).id,
        type: 'team_alert',
        title: 'Permission / OD request',
        message: `${me.full_name ?? me.email} requested permission for ${parsed.data.request_date}.`,
      });
    }

    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function reviewPermissionAction(input: { id: string; approve: boolean; remarks?: string }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'permission.approve');
    const sb = createClient();
    const { error } = await sb.from('permission_requests').update({
      status: input.approve ? 'approved' : 'rejected',
      reviewed_by: me.id,
      reviewed_at: new Date().toISOString(),
      review_remarks: input.remarks || null,
    }).eq('id', input.id);
    if (error) return fail(error.message, 'DB');

    // Notify requester
    const { data: req } = await sb.from('permission_requests').select('user_id').eq('id', input.id).single();
    if (req) {
      await notify({
        user_id: (req as any).user_id,
        type: 'team_alert',
        title: `Permission ${input.approve ? 'approved' : 'rejected'}`,
        message: `Your permission request was ${input.approve ? 'approved' : 'rejected'} by ${me.full_name ?? me.email}.`,
      });
    }

    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
