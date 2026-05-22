import { requireRole } from '@/lib/auth/require-role';
import { listLeaveRequests } from '@/lib/repositories/leave';
import { listPermissionRequests } from '@/lib/repositories/permission';
import { getDirectReports, hasDirectReports } from '@/lib/repositories/staff';
import { getPendingWeeklySubmissions, getAllPendingWeeklySubmissions } from '@/lib/repositories/weekly-approval';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST } from '@/lib/utils';
import { ClipboardList, ShieldCheck, CalendarDays } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import ReviewLeave from '../leave/review-leave';
import ReviewPermission from '../attendance/review-permission';
import ReviewWeek from './review-week';

export const dynamic = 'force-dynamic';

export default async function TeamApprovalsPage() {
  const me = await requireRole(['admin', 'team']);
  const isAdmin = me.role === 'admin';
  const isManager = await hasDirectReports(me.id);

  if (!isAdmin && !isManager) {
    return (
      <div className="space-y-6">
        <h1 className="tff-page-title">Approvals</h1>
        <p className="text-zinc-500">You do not have any direct reports or approval authority.</p>
      </div>
    );
  }

  const directReports = isManager ? await getDirectReports(me.id) : [];
  const reportIds = directReports.map((r) => r.id);

  const [pendingLeaveAll, pendingPermissionAll, pendingWeeksAll] = await Promise.all([
    listLeaveRequests({ status: 'pending' }),
    listPermissionRequests({ status: 'pending' }),
    isAdmin ? getAllPendingWeeklySubmissions() : getPendingWeeklySubmissions(me.id),
  ]);

  // Filter to manager's direct reports if not admin
  const pendingLeave = isAdmin
    ? pendingLeaveAll
    : pendingLeaveAll.filter((r: any) => reportIds.includes(r.user_id));
  const pendingPermissions = isAdmin
    ? pendingPermissionAll
    : pendingPermissionAll.filter((r: any) => reportIds.includes(r.user_id));
  const pendingWeeks = isAdmin
    ? pendingWeeksAll
    : pendingWeeksAll.filter((r: any) => reportIds.includes(r.user_id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="tff-page-title">Pending approvals</h1>
        <p className="tff-page-subtitle">
          Review and approve leave requests, permission / OD requests, and weekly timesheets from your team.
        </p>
      </div>

      {/* Weekly timesheet approvals */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-teal-600" /> Weekly timesheets ({pendingWeeks.length})
        </h2>
        {pendingWeeks.length === 0 ? (
          <EmptyState
            title="No pending timesheets"
            body="All weekly timesheets have been reviewed."
            icon={<ClipboardList className="h-6 w-6 text-zinc-400" />}
          />
        ) : (
          <div className="tff-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead className="text-right">Present</TableHead>
                  <TableHead className="text-right">Leave</TableHead>
                  <TableHead className="text-right">WFH</TableHead>
                  <TableHead className="text-right">Half-day</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingWeeks.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.users_profile?.full_name}</TableCell>
                    <TableCell className="text-xs">{formatDateIST(r.week_start)} → {formatDateIST(r.week_end)}</TableCell>
                    <TableCell className="text-right">{r.present_days}d</TableCell>
                    <TableCell className="text-right">{r.leave_days}d</TableCell>
                    <TableCell className="text-right">{r.wfh_days}d</TableCell>
                    <TableCell className="text-right">{r.half_days}d</TableCell>
                    <TableCell><ReviewWeek id={r.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Leave approvals */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-600" /> Leave requests ({pendingLeave.length})
        </h2>
        {pendingLeave.length === 0 ? (
          <EmptyState
            title="No pending leave"
            body="All leave requests have been reviewed."
            icon={<ClipboardList className="h-6 w-6 text-zinc-400" />}
          />
        ) : (
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
                {pendingLeave.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.users_profile?.full_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.leave_type}</Badge></TableCell>
                    <TableCell className="text-xs">{formatDateIST(r.from_date)} → {formatDateIST(r.to_date)}</TableCell>
                    <TableCell>{r.number_of_days}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.reason ?? '—'}</TableCell>
                    <TableCell><ReviewLeave id={r.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Permission approvals */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-600" /> Permission / OD requests ({pendingPermissions.length})
        </h2>
        {pendingPermissions.length === 0 ? (
          <EmptyState
            title="No pending permissions"
            body="All permission requests have been reviewed."
            icon={<ClipboardList className="h-6 w-6 text-zinc-400" />}
          />
        ) : (
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
                {pendingPermissions.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.users_profile?.full_name}</TableCell>
                    <TableCell>{formatDateIST(r.request_date)}</TableCell>
                    <TableCell className="text-xs">{r.from_time ?? '—'} → {r.to_time ?? '—'}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.reason ?? '—'}</TableCell>
                    <TableCell><ReviewPermission id={r.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
