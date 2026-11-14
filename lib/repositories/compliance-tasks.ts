import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/supabase/fetch-all';
import type { ComplianceTask } from '@/lib/services/compliance-progress';
import type { LinkedClient, OverviewTask } from '@/lib/services/compliance-overview';

/**
 * Every task due in [fromIso, toIso] whose sub-service is marked as a compliance item, past or future.
 * Cancelled tasks are left out. Paged, so it stays complete beyond 1,000 rows.
 */
export async function listComplianceTasks(fromIso: string, toIso: string): Promise<ComplianceTask[]> {
  const sb = createClient();
  const rows = await fetchAll<any>(() =>
    sb
      .from('tasks')
      .select('id, client_id, sub_service_id, due_date, status, is_stuck, completed_date, sub_services!inner(name, is_compliance)')
      .eq('is_deleted', false)
      .eq('sub_services.is_compliance', true)
      .neq('status', 'cancelled')
      .not('due_date', 'is', null)
      .gte('due_date', fromIso)
      .lte('due_date', toIso),
  );
  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
  return rows.map((r) => ({
    id: r.id as string,
    client_id: (r.client_id ?? null) as string | null,
    sub_service_id: r.sub_service_id as string,
    sub_service_name: one<{ name: string }>(r.sub_services)?.name ?? 'Unnamed service',
    due_date: r.due_date as string,
    status: r.status as string,
    is_stuck: !!r.is_stuck,
    completed_date: (r.completed_date ?? null) as string | null,
  }));
}

const first = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/** Like listComplianceTasks, with the client, the owner and the service's period type, for the compliance page. */
export async function listOverviewTasks(fromIso: string, toIso: string): Promise<OverviewTask[]> {
  const sb = createClient();
  const rows = await fetchAll<any>(() =>
    sb
      .from('tasks')
      .select(
        'id, client_id, assigned_to, sub_service_id, due_date, status, is_stuck, completed_date, sub_services!inner(name, is_compliance, period_type), clients!tasks_client_id_fkey(business_name), users_profile!tasks_assigned_to_fkey(full_name)',
      )
      .eq('is_deleted', false)
      .eq('sub_services.is_compliance', true)
      .neq('status', 'cancelled')
      .not('due_date', 'is', null)
      .gte('due_date', fromIso)
      .lte('due_date', toIso),
  );
  return rows.map((r) => {
    const sub = first<{ name: string; period_type: string | null }>(r.sub_services);
    return {
      id: r.id as string,
      client_id: (r.client_id ?? null) as string | null,
      client_name: first<{ business_name: string }>(r.clients)?.business_name ?? null,
      assignee_id: (r.assigned_to ?? null) as string | null,
      assignee_name: first<{ full_name: string }>(r.users_profile)?.full_name ?? null,
      sub_service_id: r.sub_service_id as string,
      sub_service_name: sub?.name ?? 'Unnamed service',
      period_type: sub?.period_type ?? null,
      due_date: r.due_date as string,
      status: r.status as string,
      is_stuck: !!r.is_stuck,
      completed_date: (r.completed_date ?? null) as string | null,
    };
  });
}

/** Every client linked to a compliance sub-service, so the page can say who has no task yet. */
export async function listLinkedComplianceClients(): Promise<LinkedClient[]> {
  const sb = createClient();
  const rows = await fetchAll<any>(() =>
    sb
      .from('client_sub_services')
      .select('client_id, sub_service_id, sub_services!inner(name, is_compliance, period_type, is_deleted), clients!inner(business_name, is_deleted)')
      .eq('sub_services.is_compliance', true)
      .eq('sub_services.is_deleted', false)
      .eq('clients.is_deleted', false)
      .neq('is_active', false),
  );
  return rows.map((r) => {
    const sub = first<{ name: string; period_type: string | null }>(r.sub_services);
    return {
      sub_service_id: r.sub_service_id as string,
      sub_service_name: sub?.name ?? 'Unnamed service',
      period_type: sub?.period_type ?? null,
      client_id: r.client_id as string,
      client_name: first<{ business_name: string }>(r.clients)?.business_name ?? 'Unknown client',
    };
  });
}

export type ClientComplianceSummary = { open: number; overdue: number };

/** For each client: open compliance tasks and how many of them are overdue or stuck. Clients with none are absent. */
export async function getClientComplianceSummary(clientIds: string[], todayIso: string): Promise<Record<string, ClientComplianceSummary>> {
  const out: Record<string, ClientComplianceSummary> = {};
  if (clientIds.length === 0) return out;
  const sb = createClient();
  for (let i = 0; i < clientIds.length; i += 150) {
    const ids = clientIds.slice(i, i + 150);
    const rows = await fetchAll<{ client_id: string; due_date: string | null; is_stuck: boolean | null }>(() =>
      sb
        .from('tasks')
        .select('client_id, due_date, is_stuck, sub_services!inner(is_compliance)')
        .eq('is_deleted', false)
        .eq('sub_services.is_compliance', true)
        .in('status', ['pending', 'in_progress', 'blocked'])
        .in('client_id', ids),
    );
    for (const r of rows) {
      const s = (out[r.client_id] ??= { open: 0, overdue: 0 });
      s.open += 1;
      if (r.is_stuck || (r.due_date && r.due_date < todayIso)) s.overdue += 1;
    }
  }
  return out;
}
