import { Suspense } from 'react';
import { requireRole } from '@/lib/auth/require-role';
import { hasCapabilities } from '@/lib/auth/capabilities-cache';
import { listTasks, countTasksByStatus, countOverdueTasks, enrichTasksWithProgress } from '@/lib/repositories/tasks';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listLeaveRequests } from '@/lib/repositories/leave';
import { listPermissionRequests } from '@/lib/repositories/permission';
import { getDirectReports } from '@/lib/repositories/staff';
import { getTodayAttendance } from '@/lib/repositories/attendance';
import Link from 'next/link';
import { DockLink } from '@/components/shell/dock-link';
import {
  ArrowRight,
  Briefcase,
  Clock,
  Users,
  AlertTriangle,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container';
import EmptyState from '@/components/sophistication/empty-state';
import { ClientsEmptyIllustration } from '@/components/ui/empty-illustrations';
import { PriorityList } from '@/components/dashboard/priority-list';
import { TeamAttendancePrompt } from '@/components/dashboard/smart-prompts';
import { TeamQuickActions } from '@/components/dashboard/team-quick-actions';

export default async function TeamWorkspace() {
  const me = await requireRole(['team', 'admin']);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">My workspace</h1>
          <p className="text-sm text-zinc-500 mt-1">Your tasks, clients and approvals in one place.</p>
        </div>
      </div>

      <TeamQuickActions />

      <Suspense fallback={<WorkspaceSkeleton />}>
        <WorkspaceBody me={me} />
      </Suspense>
    </div>
  );
}

async function WorkspaceBody({ me }: { me: Awaited<ReturnType<typeof requireRole>> }) {
  const isAdmin = me.role === 'admin';

  const [directReports, approvalCaps] = await Promise.all([
    isAdmin ? Promise.resolve([]) : getDirectReports(me.id),
    hasCapabilities(me, ['leave.approve', 'permission.approve', 'attendance.approve']),
  ]);
  const isManager = directReports.length > 0;
  const canApproveLeave = me.role === 'admin' || approvalCaps.has('leave.approve');
  const canApprovePermission = me.role === 'admin' || approvalCaps.has('permission.approve');
  const canApproveAttendance = me.role === 'admin' || approvalCaps.has('attendance.approve');
  const canSeeApprovals = canApproveLeave || canApprovePermission || canApproveAttendance || isManager;

  const [counts, overdueCount, dueSoonRaw, clients, pendingLeaveAll, pendingPermissionAll, todayAttendance] = await Promise.all([
    countTasksByStatus({ assignedTo: me.id }),
    countOverdueTasks({ assignedTo: me.id }),
    listTasks({ assignedTo: me.id, status: ['pending', 'in_progress'], limit: 6 }),
    listAccessibleClients({ limit: 8 }),
    canSeeApprovals ? listLeaveRequests({ status: 'pending' }) : Promise.resolve([]),
    canSeeApprovals ? listPermissionRequests({ status: 'pending' }) : Promise.resolve([]),
    getTodayAttendance(me.id),
  ]);

  const dueSoon = await enrichTasksWithProgress(dueSoonRaw ?? []);

  const reportIds = directReports.map((r) => r.id);
  let pendingApprovalsCount = 0;
  if (canSeeApprovals) {
    if (isAdmin) {
      pendingApprovalsCount = pendingLeaveAll.length + pendingPermissionAll.length;
    } else {
      pendingApprovalsCount =
        pendingLeaveAll.filter((r) => reportIds.includes(r.user_id)).length +
        pendingPermissionAll.filter((r) => reportIds.includes(r.user_id)).length;
    }
  }

  const totalAssigned = (counts.pending ?? 0) + (counts.in_progress ?? 0) + (counts.completed ?? 0);

  return (
    <StaggerContainer className="space-y-6">
      <TeamAttendancePrompt hasAttendance={!!todayAttendance} />

      <StaggerItem>
        <p className="text-sm text-zinc-500">
          <span className="tabular-nums">{totalAssigned}</span> tasks assigned · {overdueCount > 0 ? <><span className="tabular-nums">{overdueCount}</span> overdue</> : 'All on track'}
        </p>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Assigned', value: totalAssigned, icon: Briefcase, tone: 'default' as const },
            { label: 'Pending', value: counts.pending ?? 0, icon: Clock, tone: 'default' as const },
            { label: 'In progress', value: counts.in_progress ?? 0, icon: CalendarDays, tone: 'default' as const },
            { label: 'Overdue', value: overdueCount, icon: AlertTriangle, tone: 'warning' as const },
          ].map((m) => (
            <Link
              key={m.label}
              href="/team/tasks"
              className="tff-card p-3 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${m.tone === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-500'}`}>
                  <m.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className={`text-2xl font-bold tabular-nums tracking-tight ${m.tone === 'warning' ? 'text-amber-600' : 'text-zinc-900'}`}>{m.value}</div>
                  <div className="text-[11px] font-medium text-zinc-500">{m.label}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </StaggerItem>

      {canSeeApprovals && pendingApprovalsCount > 0 && (
        <StaggerItem>
          <Link
            href="/team/approvals"
            className="block rounded-2xl border border-amber-200 bg-amber-50 p-5 hover:border-amber-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-amber-800">
                  Attendance approval for the week due
                </div>
                <div className="text-xs text-amber-700 mt-0.5">
                  <span className="tabular-nums">{pendingApprovalsCount}</span> pending item{pendingApprovalsCount > 1 ? 's' : ''} waiting for your review
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-amber-600 ml-auto shrink-0" />
            </div>
          </Link>
        </StaggerItem>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <StaggerItem className="xl:col-span-2">
          <PriorityList tasks={dueSoon} href="/team/tasks" emptyMessage="No pending tasks" />
        </StaggerItem>
      </div>

      <StaggerItem>
        <div className="tff-card tff-card-pad">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight">My clients</h2>
              <p className="text-sm text-zinc-500 mt-1">Quick access</p>
            </div>
            <Link
              href="/team/clients"
              className="text-sm text-teal-700 hover:underline font-medium inline-flex items-center gap-1"
            >
              All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {clients.slice(0, 8).map((c) => (
              <DockLink
                key={c.id}
                item={{ type: 'client', id: c.id }}
                href={`/team/clients/${c.id}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-100 px-4 py-3 hover:border-teal-200 hover:bg-teal-50/20 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.business_name}</div>
                  <div className="text-xs text-zinc-500">{c.pan ?? '—'}</div>
                </div>
              </DockLink>
            ))}
            {clients.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  title="No clients assigned"
                  body="You don't have any clients assigned yet."
                  illustration={<ClientsEmptyIllustration />}
                />
              </div>
            )}
          </div>
        </div>
      </StaggerItem>
    </StaggerContainer>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="tff-card p-3 h-24 bg-zinc-50" />
        ))}
      </div>
      <div className="tff-card h-64 bg-zinc-50" />
      <div className="tff-card h-48 bg-zinc-50" />
    </div>
  );
}
