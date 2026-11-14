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
import { StatCard } from '@/components/ui/stat-card';
import { TeamAttendancePrompt } from '@/components/dashboard/smart-prompts';
import { TeamQuickActions } from '@/components/dashboard/team-quick-actions';
import { WeekStrip, WaitingList, WorkloadBars } from '@/components/dashboard/home-widgets';
import { getManagerHome, getMemberHome } from '@/lib/services/home-service';

export default async function TeamWorkspace() {
  const me = await requireRole(['team', 'admin']);

  return (
    <div className="space-y-3">
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
    hasCapabilities(me, ['leave.approve', 'permission.approve', 'attendance.approve', 'verify_tasks']),
  ]);
  const isManager = directReports.length > 0;
  const canApproveLeave = me.role === 'admin' || approvalCaps.has('leave.approve');
  const canApprovePermission = me.role === 'admin' || approvalCaps.has('permission.approve');
  const canApproveAttendance = me.role === 'admin' || approvalCaps.has('attendance.approve');
  const canVerify = me.role === 'admin' || approvalCaps.has('verify_tasks');
  const canSeeApprovals = canApproveLeave || canApprovePermission || canApproveAttendance || isManager;

  const reportIdsForHome = directReports.map((r) => r.id);
  const [counts, overdueCount, dueSoonRaw, clients, pendingLeaveAll, pendingPermissionAll, todayAttendance, memberHome, managerHome] = await Promise.all([
    countTasksByStatus({ assignedTo: me.id }),
    countOverdueTasks({ assignedTo: me.id }),
    listTasks({ assignedTo: me.id, status: ['pending', 'in_progress'], limit: 6 }),
    listAccessibleClients({ limit: 8 }),
    canSeeApprovals ? listLeaveRequests({ status: 'pending' }) : Promise.resolve([]),
    canSeeApprovals ? listPermissionRequests({ status: 'pending' }) : Promise.resolve([]),
    getTodayAttendance(me.id),
    getMemberHome(me.id),
    isManager ? getManagerHome(reportIdsForHome, canVerify) : Promise.resolve(null),
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

  const hourIst = new Date(Date.now() + 5.5 * 3600_000).getUTCHours();
  const greeting = hourIst < 12 ? 'Good morning' : hourIst < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date(Date.now() + 5.5 * 3600_000).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const firstName = me.full_name?.split(' ')[0] ?? '';
  const totalAssigned = (counts.pending ?? 0) + (counts.in_progress ?? 0) + (counts.completed ?? 0);

  return (
    <StaggerContainer className="space-y-3">
      <TeamAttendancePrompt hasAttendance={!!todayAttendance} />

      <StaggerItem>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E8EAEE] bg-gradient-to-br from-[#ECFDF9] to-[#F1F5FF] px-5 py-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">{greeting}{firstName ? `, ${firstName}` : ''}. Here is your day.</h2>
            <p className="text-xs text-slate-600">{dateLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {overdueCount > 0 ? (
              <Link href="/team/tasks" className="tff-pill tff-pill-bad tff-pill-dot">{overdueCount} overdue</Link>
            ) : (
              <span className="tff-pill tff-pill-good tff-pill-dot">All on track</span>
            )}
            <Link href="/team/tasks" className="tff-pill tff-pill-accent tff-pill-dot">{counts.pending ?? 0} pending</Link>
          </div>
          <TeamQuickActions />
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Assigned" value={totalAssigned} icon={<Briefcase className="h-5 w-5" />} href="/team/tasks" />
          <StatCard label="Pending" value={counts.pending ?? 0} icon={<Clock className="h-5 w-5" />} href="/team/tasks" />
          <StatCard label="In progress" value={counts.in_progress ?? 0} icon={<CalendarDays className="h-5 w-5" />} href="/team/tasks" />
          <StatCard label="Overdue" value={overdueCount} icon={<AlertTriangle className="h-5 w-5" />} href="/team/tasks" tone="red" />
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-start">
        <StaggerItem className="xl:col-span-2">
          <PriorityList tasks={dueSoon} href="/team/tasks" emptyMessage="No pending tasks" />
        </StaggerItem>
        <StaggerItem className="space-y-4">
          <WeekStrip days={memberHome.strip} href={`/team/tasks?assigned=${me.id}`} />
          <div className="tff-card p-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">Hours logged today</span>
            <span className="font-medium text-slate-900 tabular-nums">{Math.floor(memberHome.minutesToday / 60)}h {memberHome.minutesToday % 60}m</span>
          </div>
          <WaitingList tasks={memberHome.waiting} todayIso={memberHome.todayIso} href={`/team/tasks?status=blocked&assigned=${me.id}`} />
        </StaggerItem>
      </div>

      {managerHome && (
        <StaggerItem>
          <div className="space-y-3" data-testid="manager-home">
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">Your team</h2>
              <p className="text-sm text-slate-500 mt-1">
                <span className="tabular-nums">{managerHome.overdue}</span> overdue · <span className="tabular-nums">{managerHome.dueThisWeek}</span> due this week
                {canVerify ? <> · <span className="tabular-nums">{managerHome.toVerify}</span> awaiting verification</> : null}
              </p>
            </div>
            <WorkloadBars rows={managerHome.workload} title="Workload of your reports" tasksHref="/team/tasks" />
          </div>
        </StaggerItem>
      )}

      <StaggerItem>
        <div className="tff-card tff-card-pad">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">My clients</h2>
              <p className="text-sm text-slate-500 mt-1">Quick access</p>
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
                className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 hover:border-teal-200 hover:bg-teal-50/20 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.business_name}</div>
                  <div className="text-xs text-slate-500">{c.pan ?? '—'}</div>
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
          <div key={i} className="tff-card p-3 h-24 bg-slate-50" />
        ))}
      </div>
      <div className="tff-card h-64 bg-slate-50" />
      <div className="tff-card h-48 bg-slate-50" />
    </div>
  );
}
