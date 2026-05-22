'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { logNoticeClosed } from '@/lib/services/solution-log-service';

const noticeSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  notice_type: z.enum(['GST', 'Income Tax', 'TDS', 'Other']),
  notice_number: z.string().optional(),
  issuing_authority: z.string().optional(),
  notice_date: z.string().optional(),
  notice_received_date: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(['received', 'reply_pending', 'reply_submitted', 'hearing_pending', 'hearing_held', 'order_pending', 'order_received', 'closed']).default('received'),
  amount_involved: z.number().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
});

export async function upsertNoticeAction(input: z.infer<typeof noticeSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'notices.manage');
    const parsed = noticeSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { id, ...rest } = parsed.data;
    if (id) {
      // Read the prior state to detect a status→'closed' transition
      const { data: prior } = await sb.from('notices').select('status').eq('id', id).maybeSingle();
      const { error } = await sb.from('notices').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) return fail(error.message, 'DB');
      // Auto-populate solution log when the notice transitions to "closed"
      if (rest.status === 'closed' && (prior as any)?.status !== 'closed') {
        await logNoticeClosed({
          clientId: rest.client_id,
          identifiedBy: me.id,
          noticeId: id,
          noticeSubject: rest.subject ?? rest.notice_type,
          amountInvolved: rest.amount_involved ?? null,
        });
      }
      revalidatePath(`/team/clients/${rest.client_id}`);
      revalidatePath('/portal/notices');
      return ok({ id });
    }
    const { data, error } = await sb.from('notices').insert(rest).select('id').single();
    if (error) return fail(error.message, 'DB');
    revalidatePath(`/team/clients/${rest.client_id}`);
    revalidatePath('/portal/notices');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const hearingSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  notice_id: z.string().uuid().optional().nullable(),
  hearing_type: z.enum(['GST', 'Income Tax', 'TDS', 'Other']).optional(),
  hearing_scheduled_date: z.string().optional(),
  hearing_held_date: z.string().optional(),
  next_hearing_date: z.string().optional(),
  status: z.enum(['scheduled', 'held', 'adjourned', 'concluded']).default('scheduled'),
  venue: z.string().optional(),
  officer_name: z.string().optional(),
  subject: z.string().optional(),
  order_date: z.string().optional(),
  order_amount: z.number().optional(),
  order_notes: z.string().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
});
export async function upsertHearingAction(input: z.infer<typeof hearingSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'notices.manage');
    const parsed = hearingSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { id, ...rest } = parsed.data;
    if (id) {
      const { error } = await sb.from('hearings').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) return fail(error.message, 'DB');
      revalidatePath('/team/hearings');
      return ok({ id });
    }
    const { data, error } = await sb.from('hearings').insert(rest).select('id').single();
    if (error) return fail(error.message, 'DB');
    revalidatePath('/team/hearings');
    return ok({ id: data.id });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['received', 'reply_pending', 'reply_submitted', 'hearing_pending', 'hearing_held', 'order_pending', 'order_received', 'closed']),
});

export async function updateNoticeStatusAction(input: z.infer<typeof updateStatusSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'notices.manage');
    const parsed = updateStatusSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { error } = await sb.from('notices').update({ status: parsed.data.status, updated_at: new Date().toISOString() }).eq('id', parsed.data.id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/notices');
    revalidatePath('/team/notices');
    revalidatePath('/portal/notices');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const updateHearingStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['scheduled', 'held', 'adjourned', 'concluded']),
});

export async function updateHearingStatusAction(input: z.infer<typeof updateHearingStatusSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'notices.manage');
    const parsed = updateHearingStatusSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const sb = createClient();
    const { error } = await sb.from('hearings').update({ status: parsed.data.status, updated_at: new Date().toISOString() }).eq('id', parsed.data.id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/hearings');
    revalidatePath('/team/hearings');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
