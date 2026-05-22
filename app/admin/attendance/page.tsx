import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { listTeamUsers } from '@/lib/repositories/clients';
import { PageHeader } from '@/components/ui/page-header';
import AdminAttendanceRoster from './admin-attendance-roster';
import ExportButton from '@/components/sophistication/export-button';

export const dynamic = 'force-dynamic';

export default async function AdminAttendancePage({ searchParams }: { searchParams?: { date?: string } }) {
  await requireRole('admin');
  const sb = createClient();

  const dateParam = searchParams?.date;
  const { todayIST } = await import('@/lib/utils');
  const selectedDate = dateParam || todayIST();

  const teamUsers = await listTeamUsers();

  const { data: logs } = await sb
    .from('attendance_logs')
    .select('id, user_id, attendance_date, check_in_time, check_out_time, status, is_manually_created, override_reason, overridden_by')
    .eq('attendance_date', selectedDate);

  const logByUser = new Map<string, any>();
  for (const l of logs ?? []) {
    logByUser.set(l.user_id, l);
  }

  const userMap = new Map(teamUsers.map((u: any) => [u.id, u]));
  const exportData = (logs ?? []).map((l) => ({
    user_name: userMap.get(l.user_id)?.full_name ?? userMap.get(l.user_id)?.email ?? '—',
    attendance_date: l.attendance_date,
    status: l.status,
    check_in_time: l.check_in_time ? new Date(l.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
    check_out_time: l.check_out_time ? new Date(l.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle="Mark and review attendance for all staff members. Admin override is always possible."
        actions={<ExportButton data={exportData} filename="attendance" format="excel" />}
      />
      <AdminAttendanceRoster
        date={selectedDate}
        teamUsers={teamUsers as any}
        logs={logByUser}
      />
    </div>
  );
}
