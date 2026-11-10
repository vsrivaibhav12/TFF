'use server';

import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { hasCapabilities } from '@/lib/auth/capabilities-cache';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { createClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/supabase/fetch-all';
import { parseTaskFilterParams, type TaskFilterParams } from '@/lib/tasks/filter-params';
import { listTasksForExport } from '@/lib/repositories/tasks';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listWorkDoneAll } from '@/lib/repositories/work-done';
import { formatDateIST } from '@/lib/utils';

/**
 * Exports for list pages. Each one re-runs the page's own filters on the server and returns
 * every matching row, not just the page on screen, with the same access rules as the page.
 */

type Row = Record<string, string | number | null>;
type Exported = { rows: Row[]; truncated: boolean };

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Export failed');

function periodLabel(t: { period_month: number | null; period_quarter: number | null; period_year: number | null }): string {
  if (!t.period_year) return '';
  if (t.period_month) return `${new Date(t.period_year, t.period_month - 1).toLocaleString('en-IN', { month: 'short' })} ${t.period_year}`;
  if (t.period_quarter) return `Q${t.period_quarter} ${t.period_year}`;
  return String(t.period_year);
}

export async function exportTasksAction(filters: TaskFilterParams): Promise<ActionResult<Exported>> {
  try {
    const me = await requireRole(['admin', 'team']);
    // Same scoping as the list: without tasks.view a team member only sees their own tasks.
    const caps = await hasCapabilities(me, ['tasks.view']);
    const canViewAll = me.role === 'admin' || caps.has('tasks.view');
    const opts = parseTaskFilterParams(filters);
    if (!canViewAll) opts.assignedTo = opts.assignedTo ?? me.id;

    const { rows, truncated } = await listTasksForExport(opts, 10000);
    return ok({
      truncated,
      rows: rows.map((t) => ({
        'Task number': t.task_number ?? '',
        Title: t.title,
        Client: t.clients?.business_name ?? '',
        Service: t.sub_services?.name ?? '',
        Period: periodLabel(t),
        Status: t.status.replace('_', ' '),
        Priority: t.priority,
        'Due date': t.due_date ?? '',
        'Assigned to': t.users_profile?.full_name ?? '',
        Billable: t.is_billable ? 'Yes' : 'No',
        Verified: t.is_verified ? 'Yes' : 'No',
        Stuck: t.is_stuck ? 'Yes' : '',
        'Awaiting client': t.is_blocked_on_client ? 'Yes' : '',
        Created: t.created_at ? formatDateIST(t.created_at) : '',
      })),
    });
  } catch (e) {
    return fail(errorText(e), 'EXPORT_ERROR');
  }
}

export async function exportClientsAction(filters: { group?: string; city?: string; q?: string }): Promise<ActionResult<Exported>> {
  try {
    await requireRole(['admin', 'team']);
    // RLS decides which clients this person may see, exactly as on the clients page.
    const clients = await listAccessibleClients({ groupId: filters.group, city: filters.city, q: filters.q });
    const cap = 10000;
    return ok({
      truncated: clients.length > cap,
      rows: clients.slice(0, cap).map((c: any) => ({
        'Business name': c.business_name,
        GSTIN: c.gstin ?? '',
        PAN: c.pan ?? '',
        Category: c.category ?? '',
        City: c.city ?? '',
        State: c.state ?? '',
        Group: c.client_groups?.name ?? '',
      })),
    });
  } catch (e) {
    return fail(errorText(e), 'EXPORT_ERROR');
  }
}

export async function exportAuditAction(filters: { actor?: string; action?: string; entity?: string; from?: string; to?: string }): Promise<ActionResult<Exported>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'audit.view');
    const sb = createClient();
    const cap = 20000;
    const data = await fetchAll<any>(() => {
      let q = sb
        .from('global_audit_log')
        .select('id, action, entity_type, entity_id, details, performed_by, performed_at, users_profile(full_name, email)')
        .order('performed_at', { ascending: false });
      if (filters.actor) q = q.eq('performed_by', filters.actor);
      if (filters.action) q = q.eq('action', filters.action);
      if (filters.entity) q = q.eq('entity_type', filters.entity);
      if (filters.from) q = q.gte('performed_at', filters.from);
      if (filters.to) q = q.lte('performed_at', filters.to);
      return q;
    }, cap + 1);
    return ok({
      truncated: data.length > cap,
      rows: data.slice(0, cap).map((r: any) => ({
        Action: r.action,
        Entity: r.entity_type ?? '',
        'Entity id': r.entity_id ?? '',
        Actor: r.users_profile?.full_name ?? '',
        Email: r.users_profile?.email ?? '',
        When: r.performed_at,
        Details: r.details ? JSON.stringify(r.details) : '',
      })),
    });
  } catch (e) {
    return fail(errorText(e), 'EXPORT_ERROR');
  }
}

export async function exportWorkDoneAction(filters: { from?: string; to?: string; q?: string; client?: string; task?: string; user?: string }): Promise<ActionResult<Exported>> {
  try {
    const me = await requireRole(['admin', 'team']);
    const caps = await hasCapabilities(me, ['view_workdone_reports', 'workdone.manage']);
    const canSeeAll = me.role === 'admin' || caps.has('view_workdone_reports');
    if (!canSeeAll && !caps.has('workdone.manage') && me.role !== 'admin') return fail('You do not have access to work done', 'NO_CAPABILITY');
    const logs = await listWorkDoneAll({
      startDate: filters.from,
      endDate: filters.to,
      search: filters.q,
      clientId: filters.client,
      taskId: filters.task,
      // Without the report permission a person can only export their own entries.
      userId: canSeeAll ? filters.user : me.id,
    });
    const cap = 20000;
    return ok({
      truncated: logs.length >= cap,
      rows: logs.map((l: any) => ({
        Date: l.work_date,
        Staff: l.users_profile?.full_name ?? '',
        Activity: l.note ?? '',
        Minutes: l.duration_minutes,
        Client: l.clients?.business_name ?? (l.client_id ? 'Archived client' : ''),
        Task: l.tasks?.title ?? (l.task_id ? 'Archived task' : ''),
      })),
    });
  } catch (e) {
    return fail(errorText(e), 'EXPORT_ERROR');
  }
}
