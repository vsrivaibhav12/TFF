import { requireRole } from '@/lib/auth/require-role';
import { listLeaveRequests } from '@/lib/repositories/leave';
import { listPermissionRequests } from '@/lib/repositories/permission';

import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST } from '@/lib/utils';
import { ExpandableCell } from '@/components/ui/expandable-cell';
import { ClipboardList, ShieldCheck } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import ReviewLeave from '@/app/team/leave/review-leave';
import ReviewPermission from '@/app/team/attendance/review-permission';


export const dynamic = 'force-dynamic';

export default async function AdminApprovalsPage() {
  await requireRole('admin');

  const [pendingLeaveAll, pendingPermissionAll] = await Promise.all([
    listLeaveRequests({ status: 'pending' }),
    listPermissionRequests({ status: 'pending' }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="tff-page-title">Pending approvals</h1>
        <p className="tff-page-subtitle">
          Review and approve leave requests and permission / OD requests from your team.
        </p>
      </div>

      {/* Leave approvals */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-600" /> Leave requests ({pendingLeaveAll.length})
        </h2>
        {pendingLeaveAll.length === 0 ? (
          <EmptyState
            title="No pending leave"
            body="All leave requests have been reviewed."
            icon={<ClipboardList className="h-6 w-6 text-zinc-400" />}
          />
        ) : (
          <div className="tff-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
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
                {pendingLeaveAll.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.users_profile?.full_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.leave_type}</Badge></TableCell>
                    <TableCell className="text-xs">{formatDateIST(r.from_date)} → {formatDateIST(r.to_date)}</TableCell>
                    <TableCell>{r.number_of_days}</TableCell>
                    <TableCell>
                      <ExpandableCell className="max-w-[300px]" maxLines={1}>
                        {r.reason ?? '—'}
                      </ExpandableCell>
                    </TableCell>
                    <TableCell><ReviewLeave id={r.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
        )}
      </div>

      {/* Permission approvals */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-600" /> Permission / OD requests ({pendingPermissionAll.length})
        </h2>
        {pendingPermissionAll.length === 0 ? (
          <EmptyState
            title="No pending permissions"
            body="All permission requests have been reviewed."
            icon={<ClipboardList className="h-6 w-6 text-zinc-400" />}
          />
        ) : (
          <div className="tff-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
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
                {pendingPermissionAll.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.users_profile?.full_name}</TableCell>
                    <TableCell>{formatDateIST(r.request_date)}</TableCell>
                    <TableCell className="text-xs">{r.from_time ?? '—'} → {r.to_time ?? '—'}</TableCell>
                    <TableCell>
                      <ExpandableCell className="max-w-[300px]" maxLines={1}>
                        {r.reason ?? '—'}
                      </ExpandableCell>
                    </TableCell>
                    <TableCell><ReviewPermission id={r.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
