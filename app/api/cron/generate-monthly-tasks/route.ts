import { isAuthorizedCron } from '@/lib/auth/cron-auth';
import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { seedTaskStepsFromSop } from '@/lib/services/task-steps-service';
import { fetchAll } from '@/lib/supabase/fetch-all';
import { buildTaskTitle } from '@/lib/utils';

/**
 * Vercel Cron: Generate recurring tasks from client_sub_services.
 * Supports monthly, quarterly, and annual frequencies.
 *
 * Idempotent (partial unique index uniq_active_task_per_period prevents dupes).
 * Auth: Vercel cron sends `x-vercel-cron: 1` header. We also accept a shared
 * secret query param `?secret=<CRON_SECRET>` for manual triggers.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

function getQuarter(month: number): number {
  return Math.ceil(month / 3);
}

function getPeriodLabel(frequency: string, periodMonth: number, periodYear: number, periodQuarter: number): string {
  if (frequency === 'monthly') return `${periodMonth}/${periodYear}`;
  if (frequency === 'quarterly') return `Q${periodQuarter} ${periodYear}`;
  if (frequency === 'annually') return `FY ${periodYear}`;
  return `${periodMonth}/${periodYear}`;
}

function computeDueDate(ss: any, frequency: string, periodYear: number, periodMonth: number, periodQuarter: number): string {
  if (frequency === 'monthly') {
    const dom = Math.min(28, ss.due_day_of_month ?? 28);
    return new Date(periodYear, periodMonth - 1, dom).toISOString().slice(0, 10);
  }
  if (frequency === 'quarterly') {
    const dom = Math.min(28, ss.due_day_of_quarter ?? 15);
    // quarter end month: Q1=Mar(3), Q2=Jun(6), Q3=Sep(9), Q4=Dec(12)
    const quarterEndMonth = periodQuarter * 3;
    return new Date(periodYear, quarterEndMonth - 1, dom).toISOString().slice(0, 10);
  }
  if (frequency === 'annually') {
    const dom = Math.min(28, ss.due_day_of_month ?? 31);
    const dueMonth = ss.due_month ?? 3; // default March
    return new Date(periodYear, dueMonth - 1, dom).toISOString().slice(0, 10);
  }
  const dom = Math.min(28, ss.due_day_of_month ?? 28);
  return new Date(periodYear, periodMonth - 1, dom).toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return unauthorized();

  const sb = createServiceClient();
  const today = new Date();
  const periodMonth = today.getMonth() + 1;
  const periodYear = today.getFullYear();
  const periodQuarter = getQuarter(periodMonth);

  // Pull all active client_sub_services where sub_service is recurring using fetchAll
  let links: any[] = [];
  try {
    links = await fetchAll<any>(() => 
      sb.from('client_sub_services')
        .select('client_id, sub_service_id, sub_services(id, code, name, frequency, due_day_of_month, due_day_of_quarter, due_month, is_recurring)')
        .eq('is_active', true)
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Process one client/sub-service link. Returns what happened so the pool can tally it.
  async function processLink(l: any): Promise<'created' | 'skipped'> {
    const ss: any = l.sub_services;
    if (!ss || !ss.is_recurring) return 'skipped';

    const frequency = ss.frequency as string;
    let shouldCreate = false;
    let taskPeriodMonth: number | null = null;
    let taskPeriodQuarter: number | null = null;

    if (frequency === 'monthly') {
      shouldCreate = true;
      taskPeriodMonth = periodMonth;
    } else if (frequency === 'quarterly') {
      // Create at the start of each quarter (Jan, Apr, Jul, Oct)
      shouldCreate = periodMonth % 3 === 1;
      taskPeriodQuarter = periodQuarter;
    } else if (frequency === 'annually') {
      // Create 2 months before the due month to give lead time
      const dueMonth = ss.due_month ?? 3;
      const createMonth = dueMonth - 2 <= 0 ? dueMonth + 10 : dueMonth - 2;
      shouldCreate = periodMonth === createMonth;
    } else {
      return 'skipped';
    }
    if (!shouldCreate) return 'skipped';

    const dueDateStr = computeDueDate(ss, frequency, periodYear, periodMonth, periodQuarter);

    let exQ = sb
      .from('tasks')
      .select('id')
      .eq('client_id', l.client_id)
      .eq('sub_service_id', l.sub_service_id)
      .eq('period_year', periodYear)
      .eq('is_deleted', false);
    if (taskPeriodMonth !== null) exQ = exQ.eq('period_month', taskPeriodMonth);
    else if (taskPeriodQuarter !== null) exQ = exQ.eq('period_quarter', taskPeriodQuarter);

    const { data: ex } = await exQ.maybeSingle();
    if (ex) return 'skipped';

    const insertPayload: any = {
      client_id: l.client_id,
      sub_service_id: l.sub_service_id,
      title: buildTaskTitle({
        subServiceName: ss.name,
        periodYear: periodYear,
        periodMonth: taskPeriodMonth ?? undefined,
        periodQuarter: taskPeriodQuarter ?? undefined,
      }),
      status: 'pending',
      priority: 'medium',
      due_date: dueDateStr,
      period_year: periodYear,
      is_recurring: true,
    };
    if (taskPeriodMonth !== null) insertPayload.period_month = taskPeriodMonth;
    if (taskPeriodQuarter !== null) insertPayload.period_quarter = taskPeriodQuarter;

    const { data: created_row, error: insErr } = await sb.from('tasks').insert(insertPayload).select('id').single();
    if (insErr) {
      errors.push(insErr.message);
      return 'skipped';
    }
    try {
      await seedTaskStepsFromSop(sb, { task_id: (created_row as any).id, sub_service_id: l.sub_service_id });
    } catch (e: any) {
      errors.push(`SOP copy failed for task ${(created_row as any).id}: ${e?.message ?? 'unknown'}`);
    }
    return 'created';
  }

  // Run links in small concurrent batches instead of one at a time, and stop starting
  // new batches before the function time limit. The job is idempotent, so a partial run
  // can simply be triggered again and will pick up where it left off.
  const startedAt = Date.now();
  const TIME_BUDGET_MS = 48_000;
  const CONCURRENCY = 8;
  const pending = links ?? [];
  let processed = 0;
  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) break;
    const batch = pending.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((l) => processLink(l).catch((e: any) => {
        errors.push(e?.message ?? 'unknown error');
        return 'skipped' as const;
      })),
    );
    for (const r of results) {
      if (r === 'created') created++;
      else skipped++;
    }
    processed += batch.length;
  }
  const partial = processed < pending.length;

  // Record the run so admins can see it in the audit log (previously only the HTTP response).
  try {
    await sb.from('global_audit_log').insert({
      action: partial || errors.length > 0 ? 'cron.generate_monthly_tasks.warning' : 'cron.generate_monthly_tasks',
      entity_type: 'cron',
      performed_by: null,
      details: { periodMonth, periodYear, created, skipped, errors: errors.slice(0, 10), error_count: errors.length, partial, remaining: pending.length - processed },
    });
  } catch {
    // Logging must never fail the job.
  }

  return NextResponse.json({ ok: true, periodMonth, periodYear, periodQuarter, created, skipped, errors, partial, remaining: pending.length - processed });
}
