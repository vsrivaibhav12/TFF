import { type NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/auth/cron-auth';
import { createServiceClient } from '@/lib/supabase/service-role';
import { currentPeriodKey, defaultPeriodKey, formatPeriod, parsePeriodKey, periodEndIso, resolveTaskPeriodType, subServicePeriodType, type PeriodType } from '@/lib/periods';
import { buildDeadlinePlan } from '@/lib/services/deadline-plan';
import { nudgeReason } from '@/lib/services/deadline-nudge';
import {
  getDeadlineOverride,
  getRulesForSubService,
  listDeadlineClientsDirect,
  listSchedulableSubServices,
} from '@/lib/repositories/deadlines';
import { todayIST } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CAPABILITY = 'compliance.generate_tasks';
const TIME_BUDGET_MS = 48_000;

/**
 * Vercel Cron: remind the people who create deadline tasks when a period has just ended and again
 * a week before the due date, if some linked clients still have no task. It creates nothing itself:
 * someone has to choose the assignees.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const sb = createServiceClient();
  const today = todayIST();
  const [year, month] = today.split('-').map(Number);

  let recipients: string[];
  let subServices;
  try {
    recipients = await listRecipients(sb);
    subServices = await listSchedulableSubServices(sb);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }

  let checked = 0;
  let nudges = 0;
  const errors: string[] = [];

  for (const sub of subServices) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) break;
    const declared = subServicePeriodType(sub);
    const types: PeriodType[] = declared === 'gst_frequency' ? ['monthly', 'quarterly'] : [resolveTaskPeriodType(declared)];
    const keys = new Set<string>();
    for (const t of types) {
      for (const k of [defaultPeriodKey(t, { year, month }), currentPeriodKey(t, { year, month })]) if (k) keys.add(k);
    }

    for (const key of keys) {
      try {
        const period = parsePeriodKey(key);
        const periodEnd = period ? periodEndIso(period) : null;
        if (!period || !periodEnd) continue;
        const [rules, override] = await Promise.all([getRulesForSubService(sb, sub.id), getDeadlineOverride(sb, sub.id, key)]);

        // Cheap check first: does today matter for this deadline at all?
        const dueGuess = override?.due_date ?? null;
        const planned = buildDeadlinePlan({ subService: sub, periodKey: key, rules, override: dueGuess, clients: [] });
        if (!planned.ok) continue;
        const reason = nudgeReason({ periodEnd, dueDate: planned.plan.due.dueDate, today });
        if (!reason) continue;

        checked++;
        const clients = await listDeadlineClientsDirect(sb, sub.id, key);
        const full = buildDeadlinePlan({ subService: sub, periodKey: key, rules, override: dueGuess, clients });
        if (!full.ok || full.plan.counts.ready === 0) continue;

        const ready = full.plan.counts.ready;
        const due = full.plan.due.dueDate;
        const title = `${sub.name}, ${formatPeriod(full.plan.period)}: ${ready} client${ready === 1 ? ' has' : 's have'} no task`;
        // A second run on the same day must not repeat the reminder.
        const { data: already } = await sb.from('notifications').select('user_id').eq('related_entity_id', sub.id).eq('title', title).gte('created_at', `${today}T00:00:00`);
        const sent = new Set((already ?? []).map((r) => r.user_id));
        const rows = recipients.filter((id) => !sent.has(id)).map((user_id) => ({
          user_id,
          notification_type: 'compliance_due',
          title,
          message: `${reason === 'opened' ? 'The period has ended.' : 'The due date is a week away.'} ${due ? `Due ${due}. ` : ''}Open Compliance, choose Create tasks for a deadline, and assign them.`,
          related_entity_type: 'sub_service',
          related_entity_id: sub.id,
          send_via_email: true,
          email_sent: false,
        }));
        if (rows.length > 0) {
          const { error } = await sb.from('notifications').insert(rows);
          if (error) errors.push(`${sub.code} ${key}: ${error.message}`);
          else nudges += rows.length;
        }
      } catch (e: unknown) {
        errors.push(`${sub.code} ${key}: ${e instanceof Error ? e.message : 'failed'}`);
      }
    }
  }

  const timedOut = Date.now() - startedAt > TIME_BUDGET_MS;
  return NextResponse.json({ ok: !timedOut && errors.length === 0, timedOut, today, subServices: subServices.length, deadlinesNudged: checked, notifications: nudges, errors });
}

/** Active admins, plus everyone holding the capability directly or through a role template. */
async function listRecipients(sb: ReturnType<typeof createServiceClient>): Promise<string[]> {
  const ids = new Set<string>();

  const { data: admins, error: ae } = await sb.from('users_profile').select('id').eq('role', 'admin').eq('is_active', true);
  if (ae) throw ae;
  for (const a of admins ?? []) ids.add(a.id);

  const { data: explicit, error: ee } = await sb.from('staff_capabilities').select('user_id, revoked_at').eq('capability', CAPABILITY);
  if (ee) throw ee;
  const revoked = new Set((explicit ?? []).filter((r) => r.revoked_at).map((r) => r.user_id));
  for (const r of explicit ?? []) if (!r.revoked_at) ids.add(r.user_id);

  const { data: templates, error: te } = await sb.from('staff_role_template_capabilities').select('template_id').eq('capability', CAPABILITY);
  if (te) throw te;
  const templateIds = (templates ?? []).map((t) => t.template_id);
  if (templateIds.length > 0) {
    const { data: users, error: ue } = await sb.from('users_profile').select('id').in('active_role_template_id', templateIds).eq('is_active', true);
    if (ue) throw ue;
    for (const u of users ?? []) if (!revoked.has(u.id)) ids.add(u.id);
  }
  return Array.from(ids);
}
