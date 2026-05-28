import { createClient } from '@/lib/supabase/server';

export async function listAttendanceForDate(date: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('attendance_logs')
    .select('id, user_id, attendance_date, check_in_time, check_out_time, status, override_reason, users_profile!attendance_logs_user_id_fkey(full_name, email)')
    .eq('attendance_date', date)
    .order('check_in_time', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getTodayAttendance(userId: string) {
  const sb = createClient();
  const { todayIST } = await import('@/lib/utils');
  const { data, error } = await sb
    .from('attendance_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('attendance_date', todayIST())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listAttendanceForUser(userId: string, year: number, month: number) {
  const sb = createClient();
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-31`;
  const { data, error } = await sb
    .from('attendance_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('attendance_date', start)
    .lte('attendance_date', end)
    .order('attendance_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
