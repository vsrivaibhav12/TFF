import { requireRole } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import { createClient } from '@/lib/supabase/server';
import { listAttendanceForUser, getTodayAttendance, listAttendanceForAllUsers } from '@/lib/repositories/attendance';
import { listTeamUsers } from '@/lib/repositories/clients';
import AdminAttendanceRoster from '@/app/admin/attendance/admin-attendance-roster';
import { listLeaveRequests } from '@/lib/repositories/leave';
import { listPermissionRequests } from '@/lib/repositories/permission';
import { getDirectReports, hasDirectReports, getUserProfile } from '@/lib/repositories/staff';
import { getCurrentWeekSubmission, getWeekBounds, getPendingWeeklySubmissions, getAllPendingWeeklySubmissions } from '@/lib/repositories/weekly-approval';
import CheckInOut from './check-in-out';
import ManualAttendanceForm from './manual-entry-form';
import LeaveForm from '../leave/leave-form';
import ReviewLeave from '../leave/review-leave';
import PermissionForm from './permission-form';
import ReviewPermission from './review-permission';
import SubmitWeekButton from './submit-week-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST, formatTimeIST } from '@/lib/utils';
import { MapPin, ClipboardList, CalendarDays, Clock, ShieldCheck } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import Link from 'next/link';
import ExportButton from '@/components/sophistication/export-button';

export const dynamic = 'force-dynamic';

interface AttendanceLog {
  id: string;
  user_id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  leave_type?: string | null;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  check_in_accuracy_m?: number | null;
  override_reason: string | null;
  is_manually_created?: boolean;
}

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  number_of_days: number;
  reason: string | null;
  status: string;
  review_remarks?: string | null;
  users_profile?: { full_name: string | null; email?: string | null } | null;
}

interface PermissionRequest {
  id: string;
  user_id: string;
  request_date: string;
  from_time?: string | null;
  to_time?: string | null;
  reason: string | null;
  status: string;
  review_remarks?: string | null;
  users_profile?: { full_name: string | null; email?: string | null } | null;
}

interface TeamUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface UserProfile {
  geo_check_in_required?: boolean | null;
  paid_leaves_per_month?: number | null;
  reports_to?: string | null;
  full_name?: string | null;
}

export default async function AttendancePage({ searchParams }: { searchParams?: { date?: string } }) {
  const me = await requireRole(['admin', 'team']);
  const sb = createClient();
  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;

  const isManager = await hasDirectReports(me.id);
  const isAdmin = me.role === 'admin';
  const canApproveLeave = await hasCapability(me, 'leave.approve');
  const canApprovePermission = await hasCapability(me, 'permission.approve');
  const canApproveAttendance = await hasCapability(me, 'attendance.approve');
  const canViewAllAttendance = await hasCapability(me, 'attendance.view_all');

  // Fetch direct report IDs if manager
  const directReports = isManager ? await getDirectReports(me.id) : [];
  const reportIds = directReports.map((r) => r.id);

  // All-staff roster data for senior staff with attendance.view_all
  const todayIST = (await import('@/lib/utils')).todayIST();
  const selectedDate = searchParams?.date ?? todayIST;
  const [teamUsers, allLogs] = canViewAllAttendance
    ? await Promise.all([listTeamUsers(), listAttendanceForAllUsers(selectedDate)])
    : [[], []];
  const logByUser = new Map<string, AttendanceLog>();
  for (const l of allLogs) {
    logByUser.set(l.user_id, l);
  }

  const { weekStart, weekEnd } = getWeekBounds(now);

  const [
    today,
    monthLogs,
    profile,
    myLeave,
    pendingLeaveAll,
    myPermissions,
    pendingPermissionAll,
    weekSubmission,
    pendingWeeksAll,
  ] = await Promise.all([
    getTodayAttendance(me.id),
    listAttendanceForUser(me.id, now.getFullYear(), now.getMonth() + 1),
    getUserProfile(me.id),
    listLeaveRequests({ userId: me.id }),
    canApproveLeave ? listLeaveRequests({ status: 'pending' }) : Promise.resolve([]),
    listPermissionRequests({ userId: me.id }),
    canApprovePermission ? listPermissionRequests({ status: 'pending' }) : Promise.resolve([]),
    getCurrentWeekSubmission(me.id),
    (canApproveAttendance || isManager) ? (isAdmin ? getAllPendingWeeklySubmissions() : getPendingWeeklySubmissions(me.id)) : Promise.resolve([]),
  ]);

  // Filter pending items to manager's direct reports (if not admin)
  const pendingLeave = isAdmin
    ? (pendingLeaveAll as unknown as LeaveRequest[])
    : (pendingLeaveAll as unknown as LeaveRequest[]).filter((r) => reportIds.includes(r.user_id));
  const pendingPermissions = isAdmin
    ? (pendingPermissionAll as unknown as PermissionRequest[])
    : (pendingPermissionAll as unknown as PermissionRequest[]).filter((r) => reportIds.includes(r.user_id));
  const pendingWeeks = isAdmin
    ? pendingWeeksAll
    : pendingWeeksAll.filter((r: { user_id: string }) => reportIds.includes(r.user_id));

  const typedProfile = profile as UserProfile | null;
  const geoRequired = !!typedProfile?.geo_check_in_required;
  const paidLeavesPerMonth = typedProfile?.paid_leaves_per_month ?? 0;
  const present = (monthLogs as AttendanceLog[]).filter((l) => l.status === 'present').length;
  const onLeave = (monthLogs as AttendanceLog[]).filter((l) => l.status === 'leave').length;

  // Compute leave balance
  const approvedLeaveDays = (myLeave as unknown as LeaveRequest[])
    .filter((r) => r.status === 'approved' && r.from_date >= yearStart)
    .reduce((sum, r) => sum + (r.number_of_days || 0), 0);
  const leaveBalance = Math.max(0, paidLeavesPerMonth * 12 - approvedLeaveDays);

  const exportData = (monthLogs as AttendanceLog[]).map((l) => ({
    attendance_date: l.attendance_date,
    status: l.status,
    check_in_time: l.check_in_time ? formatTimeIST(l.check_in_time) : '',
    check_out_time: l.check_out_time ? formatTimeIST(l.check_out_time) : '',
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="tff-page-title">My attendance</h1>
          <p className="tff-page-subtitle">Punch in/out, leave, and permissions — all in one place.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButton data={exportData} filename="my-attendance" format="excel" />
          {isAdmin && <ManualAttendanceForm />}
          <CheckInOut today={today as AttendanceLog | null} geoRequired={geoRequired} />
          <div className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
            Attendance is tracked automatically. Your manager reviews it at the end of each week.
          </div>
        </div>
      </div>

      {/* Mini metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric label="Present this month" value={`${present}d`} icon={<ShieldCheck className="h-4 w-4" />} />
        <Metric label="On leave this month" value={`${onLeave}d`} icon={<CalendarDays className="h-4 w-4" />} />
        <Metric label="Today" value={today ? ((today as AttendanceLog | null)?.status ?? 'present') : 'Not marked'} icon={<Clock className="h-4 w-4" />} />
        <Metric label="Leave balance" value={`${leaveBalance}d`} icon={<CalendarDays className="h-4 w-4" />} color="text-teal-600" bg="bg-teal-50" border="border-teal-100" />
      </div>

      {/* Manager approval banner */}
      {(canApproveLeave || canApprovePermission || canApproveAttendance || isManager) && (pendingLeave.length > 0 || pendingPermissions.length > 0 || pendingWeeks.length > 0) && (
        <Link
          href="/team/approvals"
          className="block rounded-xl border border-amber-200 bg-amber-50 p-4 hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-800">
                Approvals pending ({pendingLeave.length + pendingPermissions.length + pendingWeeks.length})
              </div>
              <div className="text-xs text-amber-700 mt-0.5">
                {pendingLeave.length} leave · {pendingPermissions.length} permission / OD · {pendingWeeks.length} weekly timesheet{pendingWeeks.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </Link>
      )}

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance log</TabsTrigger>
          {canViewAllAttendance && <TabsTrigger value="all-staff">All staff</TabsTrigger>}
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="permission">Permission / OD</TabsTrigger>
        </TabsList>

        {/* Attendance tab */}
        <TabsContent value="attendance" className="space-y-6">
          <div className="tff-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <EmptyState
                        title="No attendance logs"
                        body="Check in today to start recording your attendance."
                        icon={<ClipboardList className="h-6 w-6 text-zinc-400" />}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  (monthLogs as unknown as AttendanceLog[]).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{formatDateIST(l.attendance_date)}</TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'leave' ? 'warning' : l.status === 'present' ? 'success' : 'outline'}>{l.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {l.check_in_time ? formatTimeIST(l.check_in_time) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {l.check_out_time ? formatTimeIST(l.check_out_time) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500">
                        {l.check_in_lat != null && l.check_in_lng != null ? (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${l.check_in_lat}&mlon=${l.check_in_lng}&zoom=16`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:text-teal-700"
                            title={l.check_in_accuracy_m ? `±${l.check_in_accuracy_m}m accuracy` : undefined}
                          >
                            <MapPin className="h-3 w-3" /> {Number(l.check_in_lat).toFixed(3)},{' '}
                            {Number(l.check_in_lng).toFixed(3)}
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* All staff tab */}
        {canViewAllAttendance && (
          <TabsContent value="all-staff" className="space-y-6">
            <AdminAttendanceRoster
              date={selectedDate}
              teamUsers={teamUsers as TeamUser[]}
              logs={logByUser}
              currentUserId={me.id}
              readOnly
              basePath="/team/attendance"
            />
          </TabsContent>
        )}

        {/* Leave tab */}
        <TabsContent value="leave" className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-500">
              Leave balance: <span className="font-semibold text-zinc-900">{leaveBalance} days</span> remaining this year
            </div>
            <LeaveForm />
          </div>

          {(canApproveLeave || isManager) && pendingLeave.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold">Pending leave approvals</h2>
              <div className="tff-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pendingLeave as LeaveRequest[]).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.users_profile?.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.leave_type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDateIST(r.from_date)} → {formatDateIST(r.to_date)}
                        </TableCell>
                        <TableCell>{r.number_of_days}</TableCell>
                        <TableCell className="max-w-xs truncate">{r.reason ?? '—'}</TableCell>
                        <TableCell>
                          <ReviewLeave id={r.id} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-base font-semibold">My leave requests</h2>
            {myLeave.length === 0 ? (
              <EmptyState
                title="No requests yet"
                body="Submit your first leave request using the button above."
                icon={<ClipboardList className="h-6 w-6 text-zinc-400" />}
              />
            ) : (
              <div className="tff-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(myLeave as unknown as LeaveRequest[]).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Badge variant="outline">{r.leave_type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDateIST(r.from_date)} → {formatDateIST(r.to_date)}
                        </TableCell>
                        <TableCell>{r.number_of_days}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500">{r.review_remarks ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </TabsContent>

        {/* Permission tab */}
        <TabsContent value="permission" className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-500">
              Request permission or on-duty (OD) for partial days.
            </div>
            <PermissionForm />
          </div>

          {(canApprovePermission || isManager) && pendingPermissions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold">Pending permission approvals</h2>
              <div className="tff-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pendingPermissions as PermissionRequest[]).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.users_profile?.full_name}</TableCell>
                        <TableCell>{formatDateIST(r.request_date)}</TableCell>
                        <TableCell className="text-xs">
                          {r.from_time ?? '—'} → {r.to_time ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{r.reason ?? '—'}</TableCell>
                        <TableCell>
                          <ReviewPermission id={r.id} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-base font-semibold">My permission requests</h2>
            {myPermissions.length === 0 ? (
              <EmptyState
                title="No requests yet"
                body="Submit your first permission request using the button above."
                icon={<ClipboardList className="h-6 w-6 text-zinc-400" />}
              />
            ) : (
              <div className="tff-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(myPermissions as PermissionRequest[]).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{formatDateIST(r.request_date)}</TableCell>
                        <TableCell className="text-xs">
                          {r.from_time ?? '—'} → {r.to_time ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{r.reason ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500">{r.review_remarks ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  color = 'text-zinc-600',
  bg = 'bg-zinc-100',
  border = 'border-zinc-200',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  bg?: string;
  border?: string;
}) {
  return (
    <div className="tff-card tff-card-pad">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg ${bg} ${color} flex items-center justify-center border ${border}`}>
          {icon}
        </div>
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div>
          <div className="mt-1 text-xl font-semibold tabular-nums capitalize">{value}</div>
        </div>
      </div>
    </div>
  );
}
