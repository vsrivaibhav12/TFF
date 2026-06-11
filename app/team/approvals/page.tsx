import { requireRole } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import { listLeaveRequests } from '@/lib/repositories/leave';
import { listPermissionRequests } from '@/lib/repositories/permission';
import { getDirectReports, hasDirectReports } from '@/lib/repositories/staff';
import EmptyState from '@/components/sophistication/empty-state';
import ReviewTableClient from './review-table-client';
import { ClipboardList, ShieldCheck } from 'lucide-react';


export const dynamic = 'force-dynamic';

export default async function TeamApprovalsPage() {
  const me = await requireRole(['admin', 'team']);
  const canApproveAny = await Promise.all([
    hasCapability(me, 'attendance.approve'),
    hasCapability(me, 'leave.approve'),
    hasCapability(me, 'permission.approve'),
  ]).then((arr) => arr.some(Boolean));
  if (!canApproveAny && me.role !== 'admin') {
    return (
      <div className="space-y-6">
        <h1 className="tff-page-title">Approvals</h1>
        <p className="text-zinc-500">You do not have approval authority.</p>
      </div>
    );
  }
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

  const [pendingLeaveAll, pendingPermissionAll] = await Promise.all([
    listLeaveRequests({ status: 'pending' }),
    listPermissionRequests({ status: 'pending' }),
  ]);

  // Filter to manager's direct reports if not admin
  const pendingLeave = isAdmin
    ? pendingLeaveAll
    : pendingLeaveAll.filter((r: any) => reportIds.includes(r.user_id));
  const pendingPermissions = isAdmin
    ? pendingPermissionAll
    : pendingPermissionAll.filter((r: any) => reportIds.includes(r.user_id));


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
          <ShieldCheck className="h-4 w-4 text-teal-600" /> Leave requests ({pendingLeave.length})
        </h2>
        {pendingLeave.length === 0 ? (
          <EmptyState
            title="No pending leave"
            body="All leave requests have been reviewed."
            icon={<ClipboardList className="h-6 w-6 text-zinc-400" />}
          />
        ) : (
          <ReviewTableClient items={pendingLeave} type="leave" />
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
          <ReviewTableClient items={pendingPermissions} type="permission" />
        )}
      </div>
    </div>
  );
}
