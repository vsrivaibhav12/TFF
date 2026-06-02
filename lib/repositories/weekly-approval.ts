import 'server-only';
import { createClient } from '@/lib/supabase/server';

function getWeekBounds(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  };
}

export async function getCurrentWeekSubmission(userId: string) {
  const sb = createClient();
  const { weekStart } = getWeekBounds(new Date());
  const { data } = await sb
    .from('weekly_timesheet_submissions')
    .select('id, status, week_start, week_end, submitted_at, approved_at, review_remarks')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();
  return data;
}

export async function getPendingWeeklySubmissions(managerId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('weekly_timesheet_submissions')
    .select('id, user_id, week_start, week_end, status, present_days, leave_days, wfh_days, half_days, permission_hours, submitted_at, users_profile!weekly_timesheet_submissions_user_id_fkey(full_name, email)')
    .eq('manager_id', managerId)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function getAllPendingWeeklySubmissions() {
  const sb = createClient();
  const { data, error } = await sb
    .from('weekly_timesheet_submissions')
    .select('id, user_id, week_start, week_end, status, present_days, leave_days, wfh_days, half_days, permission_hours, submitted_at, users_profile!weekly_timesheet_submissions_user_id_fkey(full_name, email)')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function computeWeekSummary(userId: string, weekStart: string, weekEnd: string) {
  const sb = createClient();
  const { data } = await sb
    .from('attendance_logs')
    .select('status')
    .eq('user_id', userId)
    .gte('attendance_date', weekStart)
    .lte('attendance_date', weekEnd);
  const logs = data ?? [];
  return {
    present_days: logs.filter((l) => l.status === 'present').length,
    leave_days: logs.filter((l) => l.status === 'leave').length,
    wfh_days: logs.filter((l) => l.status === 'work_from_home').length,
    half_days: 0,
  };
}

export { getWeekBounds };
