import { requireRole } from '@/lib/auth/require-role';
import { listTeamUsers } from '@/lib/repositories/clients';
import { listAttendanceForDate, getTodayAttendance } from '@/lib/repositories/attendance';
import { getUserProfile } from '@/lib/repositories/staff';
import { PageHeader } from '@/components/ui/page-header';
import AdminAttendanceRoster from './admin-attendance-roster';
import ExportButton from '@/components/sophistication/export-button';
import CheckInOut from '@/app/team/attendance/check-in-out';
import ManualAttendanceForm from '@/app/team/attendance/manual-entry-form';
import { Badge } from '@/components/ui/badge';
import { Clock, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminAttendancePage({ searchParams }: { searchParams?: { date?: string } }) {
  const me = await requireRole('admin');

  const dateParam = searchParams?.date;
  const { todayIST } = await import('@/lib/utils');
  const selectedDate = dateParam || todayIST();

  const [teamUsers, logs, today, profile] = await Promise.all([
    listTeamUsers(),
    listAttendanceForDate(selectedDate),
    getTodayAttendance(me.id),
    getUserProfile(me.id),
  ]);

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

  const geoRequired = !!(profile as any)?.geo_check_in_required;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle="Mark and review attendance for all staff members. Admin override is always possible."
        actions={<ExportButton data={exportData} filename="attendance" format="excel" />}
      />

      {/* Admin self-logging */}
      <div className="tff-card tff-card-pad space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-900">My attendance</div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {today ? (
                  <span className="flex items-center gap-1.5">
                    <Badge variant={today.status === 'leave' ? 'warning' : today.status === 'present' ? 'success' : 'outline'}>
                      {today.status}
                    </Badge>
                    {today.check_in_time && (
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Clock className="h-3 w-3" />
                        {new Date(today.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        {today.check_out_time && ` → ${new Date(today.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    )}
                  </span>
                ) : (
                  'Not marked yet'
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ManualAttendanceForm />
            <CheckInOut today={today as any} geoRequired={geoRequired} />
          </div>
        </div>
      </div>

      <AdminAttendanceRoster
        date={selectedDate}
        teamUsers={teamUsers as any}
        logs={logByUser}
        currentUserId={me.id}
      />
    </div>
  );
}
