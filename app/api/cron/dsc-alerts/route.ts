import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { sendEmail } from '@/lib/email/resend';
import { notify } from '@/lib/services/notification-service';
import { fetchAll } from '@/lib/supabase/fetch-all';
import { escapeHtml } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface DscAlertRow {
  id: string;
  client_id: string;
  holder_name: string | null;
  holder_contact_email: string | null;
  expiry_date: string;
  expiry_alert_sent: boolean;
  clients: {
    business_name: string | null;
    primary_contact_email: string | null;
    primary_owner_id: string | null;
  } | null;
}

/**
 * Daily DSC expiry alerts. Sends one email per holder + admins for any
 * DSC expiring within the next 30 days that hasn't already been alerted.
 */
export async function GET(request: NextRequest) {
  const isCron = request.headers.get('x-vercel-cron');
  const secret = request.nextUrl.searchParams.get('secret');
  if (!isCron && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sb = createServiceClient();
  const today = new Date();
  const horizon = new Date(today.getTime() + 30 * 86_400_000);

  let rows: DscAlertRow[] = [];
  try {
    rows = await fetchAll<DscAlertRow>(() =>
      sb.from('dsc_records')
        .select('id, client_id, holder_name, holder_contact_email, expiry_date, expiry_alert_sent, clients(business_name, primary_contact_email, primary_owner_id)')
        .eq('is_deleted', false)
        .eq('status', 'active')
        .gte('expiry_date', today.toISOString().slice(0, 10))
        .lte('expiry_date', horizon.toISOString().slice(0, 10))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DSC alert fetch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const sent: string[] = [];
  for (const d of rows ?? []) {
    if (d.expiry_alert_sent) continue;
    const businessName = escapeHtml(d.clients?.business_name ?? 'Client');
    const holderName = escapeHtml(d.holder_name ?? '');
    const expiryDate = escapeHtml(d.expiry_date ?? '');
    const subject = `DSC expiring soon — ${businessName} · ${holderName}`;
    const html = `<div style="font-family:Inter,Arial,sans-serif;color:#18181b"><h2>The Fiscal Fulcrum</h2><p>The DSC for <strong>${holderName}</strong> at <strong>${businessName}</strong> expires on <strong>${expiryDate}</strong>.</p><p>Renew before expiry to avoid filing disruptions.</p></div>`;

    if (d.holder_contact_email) {
      await sendEmail({ to: d.holder_contact_email, subject, html });
      sent.push(`holder:${d.holder_contact_email}`);
    }
    if (d.clients?.primary_contact_email) {
      await sendEmail({ to: d.clients.primary_contact_email, subject, html });
      sent.push(`client:${d.clients.primary_contact_email}`);
    }
    // Notify primary owner via in-app + their pref-based email
    if (d.clients?.primary_owner_id) {
      await notify({
        user_id: d.clients.primary_owner_id,
        type: 'compliance_due',
        title: 'DSC expiring soon',
        message: `${d.holder_name} (${businessName}) DSC expires on ${d.expiry_date}.`,
        related_entity_type: 'dsc_record',
        related_entity_id: d.id,
      });
    }

    await sb.from('dsc_records').update({ expiry_alert_sent: true, expiry_alert_sent_date: today.toISOString().slice(0, 10) }).eq('id', d.id);
  }

  return NextResponse.json({ checked: (rows ?? []).length, sent });
}
