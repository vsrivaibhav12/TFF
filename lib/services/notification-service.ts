import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { escapeHtml } from '@/lib/utils';

export type NotificationType =
  | 'task_assigned' | 'task_due_soon' | 'task_completed' | 'task_overdue'
  | 'document_uploaded' | 'document_request' | 'query_received' | 'compliance_due' | 'payment_reminder'
  | 'team_alert' | 'system_alert' | 'other';

export interface NotifyInput {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_type?: string;
  related_entity_id?: string;
  /** Force send the email immediately, ignoring digest preference. */
  immediate?: boolean;
}

/**
 * Central notification entry-point. Always writes the in-app row (if user prefs allow),
 * and optionally sends email immediately when the user prefers 'immediate' OR when
 * caller passes immediate=true (e.g. cron-emitted DSC alert).
 *
 * Uses the regular server client. RLS policies allow admin/team to insert/update
 * notifications for other users.
 *
 * Idempotency: callers should de-dupe at the source (we do not de-dupe here).
 */
export async function notify(input: NotifyInput) {
  const sb = createClient();

  // Read user's prefs (creating defaults if absent)
  const { data: prefRow } = await sb
    .from('notification_preferences')
    .select('email_frequency, in_app_enabled')
    .eq('user_id', input.user_id)
    .maybeSingle();
  const prefs = prefRow ?? { email_frequency: 'daily', in_app_enabled: true };

  let notificationId: string | null = null;

  // 1. Write in-app row (unless explicitly off)
  if (prefs.in_app_enabled !== false) {
    const { data } = await sb.from('notifications').insert({
      user_id: input.user_id,
      notification_type: input.type,
      title: input.title,
      message: input.message,
      related_entity_type: input.related_entity_type ?? null,
      related_entity_id: input.related_entity_id ?? null,
      send_via_email: prefs.email_frequency !== 'off',
      email_sent: false,
    }).select('id').single();
    notificationId = data?.id ?? null;
  }

  // 2. Send email immediately if pref or caller demands it
  const sendNow = input.immediate || prefs.email_frequency === 'immediate';
  if (sendNow && prefs.email_frequency !== 'off') {
    await sendOneOffEmail(sb, input, notificationId);
  }
}

async function sendOneOffEmail(sb: ReturnType<typeof createClient>, input: NotifyInput, notificationId: string | null) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@thefiscalfulcrum.com';
  if (!apiKey) return;

  const { data: profile } = await sb
    .from('users_profile')
    .select('email, full_name')
    .eq('id', input.user_id)
    .maybeSingle();
  if (!profile?.email) return;

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: profile.email,
    subject: `[TFF] ${input.title}`,
    html: emailHtml(profile.full_name ?? '', input),
  });

  // Only mark the exact notification row as sent
  if (notificationId) {
    await sb
      .from('notifications')
      .update({ email_sent: true })
      .eq('id', notificationId);
  }
}

function emailHtml(name: string, n: NotifyInput) {
  const safeName = escapeHtml(name || 'there');
  const safeTitle = escapeHtml(n.title);
  const safeMessage = escapeHtml(n.message);
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#18181b;background:#fafafa;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px">
    <h2 style="margin:0 0 8px;font-size:18px;color:#0f766e">The Fiscal Fulcrum</h2>
    <p style="margin:0 0 16px;color:#52525b;font-size:14px">Hi ${safeName},</p>
    <h3 style="margin:0 0 8px;font-size:16px">${safeTitle}</h3>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.5">${safeMessage}</p>
    <p style="margin:24px 0 0;font-size:12px;color:#71717a">This is an automated message. Manage your preferences inside the portal under Account → Notifications.</p>
  </div></body></html>`;
}
