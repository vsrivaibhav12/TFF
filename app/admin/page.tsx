import { Suspense } from 'react';
import { requireRole } from '@/lib/auth/require-role';
import { getAdminDashboardData } from '@/lib/services/dashboard-service';
import { listComplianceTasks } from '@/lib/repositories/compliance-tasks';
import { listExpiringDsc } from '@/lib/repositories/dsc';
import { DeadlineProgress, WorkloadBars } from '@/components/dashboard/home-widgets';
import { getAdminHome } from '@/lib/services/home-service';
import { addDaysIso, formatInrCompact } from '@/lib/services/home-metrics';
import Link from 'next/link';
import {
  Users,
  AlertTriangle,
  Briefcase,
  CalendarClock,
  Wallet,
  ShieldCheck,
  LogIn,
} from 'lucide-react';
import { todayIST } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';
import { PriorityList } from '@/components/dashboard/priority-list';
import { AdminQuickActions } from '@/components/dashboard/admin-quick-actions';
import { NeedsAttentionHub, type AttentionItem } from '@/components/dashboard/needs-attention-hub';
import { ComplianceProgress } from '@/components/dashboard/compliance-progress';
import { isMonthKey, monthKeyOf, periodBounds, summariseProgress, tasksToProgressEvents, upcomingFilings, type ProgressView } from '@/lib/services/compliance-progress';

export default async function AdminDashboard({ searchParams }: { searchParams?: { cview?: string; cmonth?: string } }) {
  await requireRole('admin');

  return (
    <div className="space-y-3">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBody cview={searchParams?.cview} cmonth={searchParams?.cmonth} />
      </Suspense>
    </div>
  );
}

async function DashboardBody({ cview, cmonth }: { cview?: string; cmonth?: string }) {
  const currentMonthKey = monthKeyOf(todayIST());
  const view: ProgressView = cview === 'quarter' ? 'quarter' : 'month';
  const monthKey = isMonthKey(cmonth) ? cmonth : currentMonthKey;
  const bounds = periodBounds(view, monthKey);

  const [
    {
      activeClients,
      openTasks,
      overdueTasks,
      activeEngagements,
      recentTasks,
      attentionTasks,
      pendingApprovals,
      attendanceToday,
    },
    dscExpiring,
    complianceTasks,
    home,
  ] = await Promise.all([
    getAdminDashboardData(),
    listExpiringDsc(90),
    listComplianceTasks(bounds.from < todayIST() ? bounds.from : todayIST(), bounds.to > addDaysIso(todayIST(), 14) ? bounds.to : addDaysIso(todayIST(), 14)),
    getAdminHome(),
  ]);

  const inPeriod = complianceTasks.filter((t) => t.due_date >= bounds.from && t.due_date <= bounds.to);
  const progressRows = summariseProgress(tasksToProgressEvents(inPeriod), home.todayIso);

  // Filing deadlines in the next 14 days, soonest first.
  const deadlineRows = upcomingFilings(complianceTasks, home.todayIso, addDaysIso(home.todayIso, 14)).map((r) => ({
    key: r.key,
    name: r.name,
    period: '',
    due_date: r.due_date,
    filed: r.filed,
    total: r.total,
    overdue: r.overdue,
  }));

  // One query for the whole 90-day window, bucketed here (was three separate queries).
  const todayMs = Date.parse(`${todayIST()}T00:00:00Z`);
  const daysLeft = (iso: string) => Math.round((Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - todayMs) / 86_400_000);
  const dsc30 = dscExpiring.filter((d: any) => daysLeft(d.expiry_date) <= 30).length;
  const dsc60 = dscExpiring.filter((d: any) => { const n = daysLeft(d.expiry_date); return n > 30 && n <= 60; }).length;
  const dsc90 = dscExpiring.length - dsc30 - dsc60;
  const dscSegments = [
    { label: '0-30 days', value: dsc30, color: '#DC2626' },
    { label: '31-60 days', value: dsc60, color: '#F59E0B' },
    { label: '61-90 days', value: dsc90, color: '#0D9488' },
  ].filter((s) => s.value > 0);

  const attentionItems: AttentionItem[] = [
    ...(attentionTasks ?? []).map((t: any) => ({
      id: t.id,
      type: 'blocked' as const,
      title: t.title,
      client: t.clients?.business_name ?? '—',
      reason: t.is_stuck
        ? 'Stuck'
        : t.due_date
          ? `${Math.max(1, -daysLeft(t.due_date))}d overdue`
          : 'Overdue',
      color: 'red' as AttentionItem['color'],
      href: `/admin/tasks/${t.id}`,
    })),
    ...(pendingApprovals.total > 0 ? [{
      id: 'approvals',
      type: 'approval' as const,
      title: 'Pending approvals',
      client: 'Team',
      reason: `${pendingApprovals.total} waiting`,
      color: 'teal' as AttentionItem['color'],
      href: '/admin/approvals',
    }] : []),
  ].slice(0, 5);

  const hourIst = new Date(Date.now() + 5.5 * 3600_000).getUTCHours();
  const greeting = hourIst < 12 ? 'Good morning' : hourIst < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date(`${home.todayIso}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const stuckCount = (attentionTasks ?? []).filter((t: any) => t.is_stuck).length;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[#E8EAEE] bg-gradient-to-br from-[#ECFDF9] to-[#F1F5FF] px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">{greeting}. Here is your day.</h2>
          <p className="text-xs text-slate-600">{dateLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/tasks?due_to=${addDaysIso(home.todayIso, -1)}`} className="tff-pill tff-pill-bad tff-pill-dot">{home.overdue} overdue</Link>
          <Link href={`/admin/tasks?due_from=${home.todayIso}&due_to=${addDaysIso(home.todayIso, 7)}`} className="tff-pill tff-pill-warn tff-pill-dot">{home.dueThisWeek} due this week</Link>
          {stuckCount > 0 && <Link href="/admin/tasks?is_stuck=true" className="tff-pill tff-pill-info tff-pill-dot">{stuckCount} stuck</Link>}
        </div>
        <AdminQuickActions />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Due this week"
          value={home.dueThisWeek}
          hint={`of ${home.open.toLocaleString('en-IN')} open`}
          icon={<CalendarClock className="h-5 w-5" />}
          href={`/admin/tasks?due_from=${home.todayIso}&due_to=${addDaysIso(home.todayIso, 7)}`}
        />
        <StatCard
          label="Overdue"
          value={home.overdue}
          icon={<AlertTriangle className="h-5 w-5" />}
          href={`/admin/tasks?due_to=${addDaysIso(home.todayIso, -1)}`}
          tone="red"
        />
        <StatCard
          label="Done, not yet billed"
          value={formatInrCompact(home.unbilled.amount)}
          hint={`${home.unbilled.count.toLocaleString('en-IN')} task${home.unbilled.count === 1 ? '' : 's'}`}
          icon={<Wallet className="h-5 w-5" />}
          href="/admin/reports/pending-billing"
        />
        <StatCard
          label="Team present today"
          value={`${attendanceToday.presentCount ?? 0} / ${attendanceToday.teamTotal ?? 0}`}
          hint={pendingApprovals.total > 0 ? `${pendingApprovals.total} approval${pendingApprovals.total === 1 ? '' : 's'} waiting` : undefined}
          icon={<LogIn className="h-5 w-5" />}
          href="/admin/attendance"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        <div className="lg:col-span-7">
          <ComplianceProgress
            rows={progressRows}
            view={view}
            monthKey={monthKey}
            currentMonthKey={currentMonthKey}
            basePath="/admin"
            complianceHref="/admin/compliance"
          />
        </div>
        <div className="lg:col-span-5">
          <DeadlineProgress rows={deadlineRows} href="/admin/compliance" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        <div className="lg:col-span-7 space-y-3">
          <NeedsAttentionHub items={attentionItems} />
          <PriorityList tasks={recentTasks} href="/admin/tasks" />
        </div>
        <div className="lg:col-span-5 space-y-3">
          <WorkloadBars rows={home.workload} tasksHref="/admin/tasks" />
          {dscSegments.length > 0 && (
            <Link href="/admin/dsc" className="tff-card p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-all">
              <span className="h-9 w-9 rounded-[10px] bg-amber-50 text-amber-600 flex items-center justify-center"><ShieldCheck className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900">DSC expiry</div>
                <div className="text-xs text-slate-500">Next 90 days</div>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-end">
                {dscSegments.map((s) => (
                  <span key={s.label} className={`tff-pill ${s.label === '0-30 days' ? 'tff-pill-bad' : s.label === '31-60 days' ? 'tff-pill-warn' : 'tff-pill-mute'}`}>{s.value} in {s.label}</span>
                ))}
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="tff-card h-[74px] bg-zinc-50" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 tff-card h-56 bg-zinc-50" />
        <div className="lg:col-span-5 tff-card h-56 bg-zinc-50" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 tff-card h-64 bg-zinc-50" />
        <div className="lg:col-span-5 tff-card h-64 bg-zinc-50" />
      </div>
    </div>
  );
}
