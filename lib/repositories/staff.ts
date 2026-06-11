import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getDirectReports(managerId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('users_profile')
    .select('id, full_name, email')
    .eq('reports_to', managerId)
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
    .eq('reports_to', managerId)
    .eq('is_active', true)
    .eq('is_deleted', false);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getUserProfile(userId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('users_profile')
    .select('geo_check_in_required, reports_to, full_name, email, role, staff_payroll_settings(paid_leaves_per_month)')
    .eq('id', userId)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  return data;
}
