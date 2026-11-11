import { createClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/supabase/fetch-all';

export type PeriodReviewRow = {
  id: string;
  task_number: string | null;
  status: string;
  period_year: number | null;
  period_month: number | null;
  period_quarter: number | null;
  period_key: string | null;
  clients: { business_name: string } | { business_name: string }[] | null;
  sub_services: { name: string; frequency: string | null; period_type: string | null } | { name: string; frequency: string | null; period_type: string | null }[] | null;
};

/** Every active task that belongs to a sub-service, with the fields needed to check its period. */
export async function listTasksForPeriodReview(): Promise<PeriodReviewRow[]> {
  const sb = createClient();
  return fetchAll<PeriodReviewRow>(() =>
    sb
      .from('tasks')
      .select('id, task_number, status, period_year, period_month, period_quarter, period_key, clients!tasks_client_id_fkey(business_name), sub_services!tasks_sub_service_id_fkey(name, frequency, period_type)')
      .eq('is_deleted', false)
      .not('sub_service_id', 'is', null),
  );
}
