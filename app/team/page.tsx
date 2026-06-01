import { requireRole } from '@/lib/auth/require-role';
import { listTasks, countTasksByStatus, countOverdueTasks } from '@/lib/repositories/tasks';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listLeaveRequests } from '@/lib/repositories/leave';
import { listPermissionRequests } from '@/lib/repositories/permission';
import { getDirectReports } from '@/lib/repositories/staff';


import { enrichTasksWithProgress } from '@/lib/repositories/tasks';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Briefcase,
  Clock,
  Users,
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  Timer,
  ShieldCheck,
} from 'lucide-react';
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container';
import EmptyState from '@/components/sophistication/empty-state';
import { ClientsEmptyIllustration } from '@/components/ui/empty-illustrations';
import { PriorityList } from '@/components/dashboard/priority-list';
import { TeamAttendancePrompt } from '@/components/dashboard/smart-prompts';

export const dynamic = 'force-dynamic';

export default async function TeamWorkspace() {
  const me = await requireRole(['team', 'admin']);
  const isAdmin = me.role === 'admin';
  const directReports = isAdmin ? [] : await getDirectReports(me.id);
  const isManager = directReports.length > 0;
  const canSeeApprovals = isAdmin || isManager;

  const [counts, overdueCount, dueSoonRaw, clients, pendingLeaveAll, pendingPermissionAll] = await Promise.all([
    countTasksByStatus({ assignedTo: me.id }),
    countOverdueTasks({ assignedTo: me.id }),
    listTasks({ assignedTo: me.id, status: ['pending', 'in_progress'], limit: 6 }),
    listAccessibleClients(),
    canSeeApprovals ? listLeaveRequests({ status: 'pending' }) : Promise.resolve([]),
    canSeeApprovals ? listPermissionRequests({ status: 'pending' }) : Promise.resolve([]),

  ]);

  const dueSoon = await enrichTasksWithProgress(dueSoonRaw ?? []);


  const reportIds = directReports.map((r) => r.id);
  let pendingApprovalsCount = 0;
  if (canSeeApprovals) {
    if (isAdmin) {
      pendingApprovalsCount = pendingLeaveAll.length + pendingPermissionAll.length;
    } else {
      pendingApprovalsCount =
        pendingLeaveAll.filter((r: any) => reportIds.includes(r.user_id)).length +
        pendingPermissionAll.filter((r: any) => reportIds.includes(r.user_id)).length;
    }
  }

  const totalAssigned = (counts.pending ?? 0) + (counts.in_progress ?? 0) + (counts.completed ?? 0);

  return (
    <StaggerContainer className="space-y-6">
      <TeamAttendancePrompt />
      {/* Header */}
      <StaggerItem>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-stone-900">My workspace</h1>
            <p className="text-sm text-stone-500 mt-1">
              {totalAssigned} tasks assigned · {overdueCount > 0 ? `${overdueCount} overdue` : 'All on track'}
            </p>
          </div>
        </div>
      </StaggerItem>



      {/* Metrics */}
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
              className="tff-card p-5 transition-all duration-200 hover:shadow-card-hover"
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${m.tone === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-stone-100 text-stone-500'}`}>
                <m.icon className="h-4 w-4" />
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-bold tabular-nums tracking-tight ${m.tone === 'warning' ? 'text-amber-600' : 'text-stone-900'}`}>{m.value}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mt-1">{m.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </StaggerItem>

      {/* Manager approval alert */}
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
                  {pendingApprovalsCount} pending item{pendingApprovalsCount > 1 ? 's' : ''} waiting for your review
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-amber-600 ml-auto shrink-0" />
            </div>
          </Link>
        </StaggerItem>
      )}

      {/* Tasks + Compliance grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <StaggerItem className="xl:col-span-2">
          <PriorityList tasks={dueSoon as any} href="/team/tasks" emptyMessage="No pending tasks" />
        </StaggerItem>


      </div>

      {/* My clients quick access */}
      <StaggerItem>
        <div className="tff-card tff-card-pad">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-stone-900 tracking-tight">My clients</h2>
              <p className="text-sm text-stone-500 mt-1">Quick access</p>
            </div>
            <Link
              href="/team/clients"
              className="text-sm text-teal-700 hover:underline font-medium inline-flex items-center gap-1"
            >
              All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {clients.slice(0, 8).map((c: any) => (
              <Link
                key={c.id}
                href={`/team/clients/${c.id}`}
                className="flex items-center gap-3 rounded-xl border border-stone-100 px-4 py-3 hover:border-teal-200 hover:bg-teal-50/20 transition-all"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.business_name}</div>
                  <div className="text-xs text-stone-500">{c.pan ?? '—'}</div>
                </div>
              </Link>
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
