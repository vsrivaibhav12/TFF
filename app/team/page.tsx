import { requireRole } from '@/lib/auth/require-role';
import { listTasks, countTasksByStatus, countOverdueTasks } from '@/lib/repositories/tasks';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listLeaveRequests } from '@/lib/repositories/leave';
import { listPermissionRequests } from '@/lib/repositories/permission';
import { getDirectReports } from '@/lib/repositories/staff';
import { getPendingWeeklySubmissions, getAllPendingWeeklySubmissions } from '@/lib/repositories/weekly-approval';
import { listAllUpcomingDueDates } from '@/lib/repositories/compliance';
import { enrichTasksWithProgress } from '@/lib/repositories/tasks';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateIST } from '@/lib/utils';
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
import { TeamQuickActions } from '@/components/dashboard/team-quick-actions';

export const dynamic = 'force-dynamic';

export default async function TeamWorkspace() {
  const me = await requireRole(['team', 'admin']);
  const isAdmin = me.role === 'admin';
  const directReports = isAdmin ? [] : await getDirectReports(me.id);
  const isManager = directReports.length > 0;
  const canSeeApprovals = isAdmin || isManager;

  const [counts, overdueCount, dueSoonRaw, clients, pendingLeaveAll, pendingPermissionAll, pendingWeeksAll, compliances] = await Promise.all([
    countTasksByStatus({ assignedTo: me.id }),
    countOverdueTasks({ assignedTo: me.id }),
    listTasks({ assignedTo: me.id, status: ['pending', 'in_progress'], limit: 6 }),
    listAccessibleClients(),
    canSeeApprovals ? listLeaveRequests({ status: 'pending' }) : Promise.resolve([]),
    canSeeApprovals ? listPermissionRequests({ status: 'pending' }) : Promise.resolve([]),
    canSeeApprovals ? (isAdmin ? getAllPendingWeeklySubmissions() : getPendingWeeklySubmissions(me.id)) : Promise.resolve([]),
    listAllUpcomingDueDates(15)
  ]);

  const dueSoon = await enrichTasksWithProgress(dueSoonRaw ?? []);

  const allCompliances = [...compliances.gst, ...compliances.tds, ...compliances.it].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const reportIds = directReports.map((r) => r.id);
  let pendingApprovalsCount = 0;
  if (canSeeApprovals) {
    if (isAdmin) {
      pendingApprovalsCount = pendingLeaveAll.length + pendingPermissionAll.length + pendingWeeksAll.length;
    } else {
      pendingApprovalsCount =
        pendingLeaveAll.filter((r: any) => reportIds.includes(r.user_id)).length +
        pendingPermissionAll.filter((r: any) => reportIds.includes(r.user_id)).length +
        pendingWeeksAll.filter((r: any) => reportIds.includes(r.user_id)).length;
    }
  }

  const totalAssigned = (counts.pending ?? 0) + (counts.in_progress ?? 0) + (counts.completed ?? 0);

  return (
    <StaggerContainer className="space-y-6">
      {/* Header */}
      <StaggerItem>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">My workspace</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {totalAssigned} tasks assigned · {overdueCount > 0 ? `${overdueCount} overdue` : 'All on track'}
            </p>
          </div>
        </div>
      </StaggerItem>

      {/* Quick Actions */}
      <StaggerItem>
        <TeamQuickActions />
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
              className="rounded-2xl bg-white p-5 transition-all duration-200 hover:shadow-sm"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${m.tone === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-500'}`}>
                <m.icon className="h-4 w-4" />
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-bold tabular-nums tracking-tight ${m.tone === 'warning' ? 'text-amber-600' : 'text-zinc-900'}`}>{m.value}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mt-1">{m.label}</div>
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

        <StaggerItem>
          <div className="rounded-2xl bg-white p-5 md:p-6 h-full flex flex-col" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 tracking-tight">Upcoming compliance</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Due within 15 days</p>
              </div>
              <Link href="/team/attendance" className="text-xs text-teal-700 hover:underline font-medium inline-flex items-center gap-1">
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {allCompliances.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-zinc-400 py-8">No upcoming compliance</div>
            ) : (
              <div className="space-y-2">
                {allCompliances.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-900 truncate">{c.clients?.business_name}</div>
                      <div className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{c.compliance_calendar_rules?.service_kind}</Badge>
                        <span>{c.return_type} ({c.period_label})</span>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 shrink-0">
                      Due {formatDateIST(c.due_date)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </StaggerItem>
      </div>

      {/* My clients quick access */}
      <StaggerItem>
        <div className="rounded-2xl bg-white p-6 md:p-8" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
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
            {clients.slice(0, 8).map((c: any) => (
              <Link
                key={c.id}
                href={`/team/clients/${c.id}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-100 px-4 py-3 hover:border-teal-200 hover:bg-teal-50/20 transition-all"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.business_name}</div>
                  <div className="text-xs text-zinc-500">{c.pan ?? '—'}</div>
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

      {/* Quick links */}
      <StaggerItem>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: '/team/attendance', label: 'Attendance', icon: ClipboardCheck },
            { href: '/team/leave', label: 'Leave', icon: CalendarDays },
            { href: '/team/queries', label: 'Queries', icon: Users },
            { href: '/team/notices', label: 'Notices', icon: AlertTriangle },
          ].map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 hover:shadow-sm transition-all"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <q.icon className="h-5 w-5 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-700">{q.label}</span>
            </Link>
          ))}
        </div>
      </StaggerItem>
    </StaggerContainer>
  );
}
