import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/supabase/fetch-all';
import type { ComplianceTask } from '@/lib/services/compliance-progress';

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
