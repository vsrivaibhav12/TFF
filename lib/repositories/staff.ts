import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getDirectReports(managerId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('users_profile')
    .select('id, full_name, email')
    .eq('manager_id', managerId)
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function hasDirectReports(managerId: string): Promise<boolean> {
  const sb = createClient();
  const { count, error } = await sb
    .from('users_profile')
    .select('id', { count: 'exact', head: true })
    .eq('manager_id', managerId)
    .eq('is_active', true)
    .eq('is_deleted', false);
  if (error) throw error;
  return (count ?? 0) > 0;
}
