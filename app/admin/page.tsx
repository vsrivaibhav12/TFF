import { Suspense } from 'react';
import { requireRole } from '@/lib/auth/require-role';
import { getAdminDashboardData } from '@/lib/services/dashboard-service';
import { loadComplianceDashboard, loadComplianceProgressEvents } from '@/lib/repositories/compliance-dashboard';
import { listExpiringDsc } from '@/lib/repositories/dsc';
import { MicroBarChart } from '@/components/charts/micro-bar-chart';
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
import { isMonthKey, monthKeyOf, periodBounds, summariseProgress, type ProgressView } from '@/lib/services/compliance-progress';

export default async function AdminDashboard({ searchParams }: { searchParams?: { cview?: string; cmonth?: string } }) {
  await requireRole('admin');

  return (
    <div className="space-y-6">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Firm overview</h1>
          <p className="tff-page-subtitle">Everything you need to run the firm, at a glance.</p>
        </div>
        <AdminQuickActions />
      </div>

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
    complianceCells,
    dscExpiring,
    progressEvents,
    home,
  ] = await Promise.all([
    getAdminDashboardData(),
    loadComplianceDashboard({ horizonMonths: 3 }),
    listExpiringDsc(90),
    loadComplianceProgressEvents(bounds.from, bounds.to),
    getAdminHome(),
  ]);

  const progressRows = summariseProgress(progressEvents, home.todayIso);

  // Filing deadlines in the next 14 days, soonest first.
  const horizon = addDaysIso(home.todayIso, 14);
  const deadlineRows = complianceCells
    .filter((c) => c.period_due_date <= horizon)
    .sort((x, y) => x.period_due_date.localeCompare(y.period_due_date))
    .slice(0, 6)
    .map((c) => ({
      key: `${c.rule_code}::${c.period_label}`,
      name: c.rule_name,
      period: c.period_label,
      due_date: c.period_due_date,
      filed: c.filed,
      total: c.total_clients,
      overdue: c.overdue,
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          label="Team present today"
          value={`${attendanceToday.presentCount ?? 0} / ${attendanceToday.teamTotal ?? 0}`}
          icon={<LogIn className="h-5 w-5" />}
          href="/admin/attendance"
        />
        <StatCard
          label="Done, not yet billed"
          value={formatInrCompact(home.unbilled.amount)}
          hint={`${home.unbilled.count.toLocaleString('en-IN')} task${home.unbilled.count === 1 ? '' : 's'}`}
          icon={<Wallet className="h-5 w-5" />}
          href="/admin/reports/pending-billing"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <NeedsAttentionHub items={attentionItems} />
        </div>
        <div className="lg:col-span-5">
          <PriorityList tasks={recentTasks} href="/admin/tasks" />
        </div>
      </div>

      <DeadlineProgress rows={deadlineRows} href="/admin/compliance" />

      <ComplianceProgress
        rows={progressRows}
        view={view}
        monthKey={monthKey}
        currentMonthKey={currentMonthKey}
        basePath="/admin"
        complianceHref="/admin/compliance"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <WorkloadBars rows={home.workload} tasksHref="/admin/tasks" />
        </div>
        <div className="lg:col-span-5 space-y-4">
          <StatCard
            label="Pending approvals"
            value={pendingApprovals.total}
            icon={<ShieldCheck className="h-5 w-5" />}
            href="/admin/approvals"
            tone="amber"
          />
          {dscSegments.length > 0 && (
            <Link href="/admin/dsc" className="tff-card p-4 block hover:border-zinc-300 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="tff-section-title">DSC expiry</h3>
                <span className="text-xs text-zinc-500">Next 90 days</span>
              </div>
              <MicroBarChart segments={dscSegments} />
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
