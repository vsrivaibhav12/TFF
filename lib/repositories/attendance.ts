import { createClient } from '@/lib/supabase/server';

export async function listAttendanceForDate(date: string): Promise<Array<{ id: string; user_id: string; attendance_date: string; check_in_time: string | null; check_out_time: string | null; status: string; override_reason: string | null; users_profile?: { full_name: string | null; email: string | null } | null }>> {
  const sb = createClient();
  const { data, error } = await sb
    .from('attendance_logs')
    .select('id, user_id, attendance_date, check_in_time, check_out_time, status, override_reason, users_profile!attendance_logs_user_id_fkey(full_name, email)')
    .eq('attendance_date', date)
    .order('check_in_time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function getTodayAttendance(userId: string): Promise<{ id: string; user_id: string; attendance_date: string; check_in_time: string | null; check_out_time: string | null; status: string; leave_type: string | null; is_manually_created: boolean; override_reason: string | null; overridden_by: string | null; created_at: string; updated_at: string } | null> {
  const sb = createClient();
  const { todayIST } = await import('@/lib/utils');
  const { data, error } = await sb
    .from('attendance_logs')
    .select('id, user_id, attendance_date, check_in_time, check_out_time, status, leave_type, is_manually_created, override_reason, overridden_by, created_at, updated_at')
    .eq('user_id', userId)
    .eq('attendance_date', todayIST())
    .maybeSingle();
  if (error) throw error;
  return data as any;
}

export async function listAttendanceForAllUsers(date: string): Promise<Array<{ id: string; user_id: string; attendance_date: string; check_in_time: string | null; check_out_time: string | null; status: string; override_reason: string | null; users_profile?: { full_name: string | null; email: string | null } | null }>> {
  const sb = createClient();
  const { data, error } = await sb
    .from('attendance_logs')
    .select('id, user_id, attendance_date, check_in_time, check_out_time, status, override_reason, users_profile!attendance_logs_user_id_fkey(full_name, email)')
    .eq('attendance_date', date)
    .order('check_in_time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any;
}

/**
 * Attendance records in a date range for all staff (or one person), with names resolved.
 * Paged so a long range with many staff is never silently cut off at 1,000 rows.
 */
export async function listAttendanceRange(opts: { from: string; to: string; userId?: string }) {
  const { fetchAll } = await import('@/lib/supabase/fetch-all');
  const sb = createClient();
  const rows = await fetchAll<{
    id: string; user_id: string; attendance_date: string; check_in_time: string | null; check_out_time: string | null;
    status: string; leave_type: string | null; override_reason: string | null; is_manually_created: boolean | null;
    users_profile: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
  }>(() => {
    let q = sb
      .from('attendance_logs')
      .select('id, user_id, attendance_date, check_in_time, check_out_time, status, leave_type, override_reason, is_manually_created, users_profile!attendance_logs_user_id_fkey(full_name, email)')
      .gte('attendance_date', opts.from)
      .lte('attendance_date', opts.to)
      .order('attendance_date', { ascending: false });
    if (opts.userId) q = q.eq('user_id', opts.userId);
    return q;
  }, 20000);
  return rows.map((r) => {
    const u = Array.isArray(r.users_profile) ? r.users_profile[0] : r.users_profile;
    return { ...r, user_name: u?.full_name || u?.email || 'Unknown' };
  });
}

export async function listAttendanceForUser(userId: string, year: number, month: number) {
  const sb = createClient();
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const { data, error } = await sb
    .from('attendance_logs')
    .select('id, user_id, attendance_date, check_in_time, check_out_time, status, leave_type, is_manually_created, override_reason, overridden_by, created_at, updated_at')
    .eq('user_id', userId)
    .gte('attendance_date', start)
    .lte('attendance_date', end)
    .order('attendance_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
