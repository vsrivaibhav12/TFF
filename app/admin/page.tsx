import { requireRole } from '@/lib/auth/require-role';
import { getAdminDashboardData } from '@/lib/services/dashboard-service';
import { loadComplianceDashboard } from '@/lib/repositories/compliance-dashboard';
import { listExpiringDsc } from '@/lib/repositories/dsc';
import { getTaskClosureVelocity } from '@/lib/repositories/tasks';
import { MicroBarChart } from '@/components/charts/micro-bar-chart';
import { Sparkline } from '@/components/charts/sparkline';
import Link from 'next/link';
import { DockLink } from '@/components/shell/dock-link';
import {
  Users,
  AlertTriangle,
  Briefcase,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  LogIn,
  MessageSquare,
} from 'lucide-react';
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container';
import { dueLabel } from '@/lib/utils';
import { PriorityList } from '@/components/dashboard/priority-list';
import { AdminPayrollPrompt } from '@/components/dashboard/smart-prompts';
import { AdminQuickActions } from '@/components/dashboard/admin-quick-actions';
import { NeedsAttentionHub, type AttentionItem } from '@/components/dashboard/needs-attention-hub';
import { ActivityFeed } from '@/components/dashboard/activity-feed';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireRole('admin');

  const {
    activeClients,
    openTasks,
    overdueTasks,
    activeEngagements,
    recentTasks,
    upcomingDeadlines,
    upcomingNotices,
    attentionTasks,
    pendingApprovals,
    attendanceToday,
    openNoticesCount,
    openQueriesCount,
    openQueries,
    recentAuditLogs,
  } = await getAdminDashboardData();

  const complianceCells = await loadComplianceDashboard({ horizonMonths: 3 });
  // Pick the most imminent period for each unique rule
  const bestByRule = new Map<string, typeof complianceCells[0]>();
  for (const cell of complianceCells) {
    const existing = bestByRule.get(cell.rule_code);
    if (!existing || cell.period_due_date < existing.period_due_date) {
      bestByRule.set(cell.rule_code, cell);
    }
  }
  const topCompliance = Array.from(bestByRule.values())
    .sort((a, b) => a.period_due_date.localeCompare(b.period_due_date))
    .slice(0, 6);

  // DSC expiry radar
  const [dsc30, dsc60, dsc90] = await Promise.all([
    listExpiringDsc(30),
    listExpiringDsc(60),
    listExpiringDsc(90),
  ]);
  const dscSegments = [
    { label: '0-30 days', value: dsc30.length, color: '#DC2626' },
    { label: '31-60 days', value: dsc60.length - dsc30.length, color: '#F59E0B' },
    { label: '61-90 days', value: dsc90.length - dsc60.length, color: '#0D9488' },
  ].filter((s) => s.value > 0);

  // Task closure velocity (last 30 days)
  const closureVelocity = await getTaskClosureVelocity(30);

  // Build attention items for NeedsAttentionHub
  const attentionItems: AttentionItem[] = [
    ...(attentionTasks ?? []).map((t: any) => ({
      id: t.id,
      type: 'blocked' as const,
      title: t.title,
      client: t.clients?.business_name ?? '—',
      reason: t.is_stuck ? 'Stuck' : 'Pending',
      color: (t.is_stuck ? 'red' : 'amber') as AttentionItem['color'],
      href: `/admin/tasks/${t.id}`,
    })),
    ...(openQueries ?? []).map((q: any) => ({
      id: q.id,
      type: 'query' as const,
      title: q.subject ?? 'Open query',
      client: q.clients?.business_name ?? '—',
      reason: 'Open',
      color: 'blue' as AttentionItem['color'],
      href: `/admin/queries/${q.id}`,
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
    <StaggerContainer className="space-y-6">
      <AdminPayrollPrompt />
      {/* Header */}
      <StaggerItem>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">Firm overview</h1>
            <p className="text-sm text-zinc-500 mt-1">Everything you need to run the firm — at a glance.</p>
          </div>
        </div>
      </StaggerItem>

      {/* Quick Actions */}
      <StaggerItem>
        <AdminQuickActions />
      </StaggerItem>

      {/* Needs Attention Hub */}
      {attentionItems.length > 0 && (
        <StaggerItem>
          <NeedsAttentionHub items={attentionItems} />
        </StaggerItem>
      )}

      {/* Stat Cards */}
      <StaggerItem>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active clients" value={activeClients ?? 0} icon={<Users className="h-5 w-5" />} href="/admin/clients" />
          <StatCard label="Open work items" value={openTasks ?? 0} icon={<Briefcase className="h-5 w-5" />} href="/admin/tasks" />
          <StatCard label="Active engagements" value={activeEngagements ?? 0} icon={<TrendingUp className="h-5 w-5" />} href="/admin/clients" />
          <StatCard label="Overdue filings" value={overdueTasks ?? 0} icon={<AlertTriangle className="h-5 w-5" />} href="/admin/tasks" tone="warning" />
        </div>
      </StaggerItem>

      {/* Compliance Bird's-Eye */}
      {topCompliance.length > 0 && (
        <StaggerItem>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-700 tracking-tight">Compliance this quarter</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {topCompliance.map((c) => {
                const pct = c.total_clients > 0 ? Math.round((c.filed / c.total_clients) * 100) : 0;
                const tone = pct >= 90 ? 'success' : pct >= 60 ? 'warning' : 'danger';
                return (
                  <Link
                    key={c.rule_code}
                    href={`/admin/compliance?rule=${c.rule_code}`}
                    className="tff-card p-3 hover:border-teal-200 transition-colors group"
                  >
                    <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider truncate">{c.rule_name}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{c.period_label}</div>
                    <div className={`text-xl font-bold tabular-nums tracking-tight mt-2 ${tone === 'success' ? 'text-teal-700' : tone === 'warning' ? 'text-amber-600' : 'text-red-600'}`}>
                      {c.filed}<span className="text-zinc-300 text-sm font-medium">/{c.total_clients}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${tone === 'success' ? 'bg-teal-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-zinc-400">{pct}% filed</span>
                      {c.overdue > 0 && <span className="text-[10px] text-red-600 font-medium">{c.overdue} overdue</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </StaggerItem>
      )}

      {/* DSC expiry + Task velocity micro-row */}
      {(dscSegments.length > 0 || closureVelocity.length > 0) && (
        <StaggerItem>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dscSegments.length > 0 && (
              <Link href="/admin/dsc" className="tff-card p-4 hover:border-teal-200 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-zinc-700">DSC expiry radar</h3>
                  <span className="text-xs text-zinc-400">Next 90 days</span>
                </div>
                <MicroBarChart segments={dscSegments} />
              </Link>
            )}
            {closureVelocity.length > 0 && (
              <div className="tff-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-zinc-700">Task closure velocity</h3>
                  <span className="text-xs text-zinc-400">Last 30 days</span>
                </div>
                <Sparkline
                  data={closureVelocity.map((d) => ({ label: d.date.slice(5), value: d.count }))}
                  color="#0D9488"
                  height={50}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-zinc-400">
                    Total closed: <span className="font-medium text-zinc-700 tabular-nums">{closureVelocity.reduce((sum, d) => sum + d.count, 0)}</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Avg/day: <span className="font-medium text-zinc-700 tabular-nums">{(closureVelocity.reduce((sum, d) => sum + d.count, 0) / 30).toFixed(1)}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </StaggerItem>
      )}

      {/* Widget Grid */}
      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <PriorityList tasks={recentTasks} href="/admin/tasks" />
          </div>
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Team attendance today"
                value={`${attendanceToday.presentCount ?? 0} / ${attendanceToday.teamTotal ?? 0}`}
                icon={<LogIn className="h-5 w-5" />}
                href="/admin/attendance"
              />
              <StatCard
                label="Open queries"
                value={openQueriesCount ?? 0}
                icon={<MessageSquare className="h-5 w-5" />}
                href="/admin/queries"
              />
              <StatCard
                label="Pending approvals"
                value={pendingApprovals.total}
                icon={<ShieldCheck className="h-5 w-5" />}
                href="/admin/approvals"
              />
            </div>
            <ActivityFeed items={recentAuditLogs as any} href="/admin/audit-log" />
          </div>
        </div>
      </StaggerItem>

      {/* Notice deadlines */}
      {(upcomingNotices ?? []).length > 0 && (
        <StaggerItem>
          <div className="tff-card tff-card-pad">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 tracking-tight">Notice deadlines</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Upcoming notice due dates</p>
              </div>
              <Link href="/admin/notices" className="text-xs text-teal-700 hover:underline font-medium inline-flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-0">
              {(upcomingNotices ?? []).map((n, i) => (
                <DockLink
                  key={n.id}
                  item={{ type: 'notice', id: n.id }}
                  href={`/admin/notices/${n.id}`}
                  className={`flex items-center gap-3 py-3 ${i !== (upcomingNotices ?? []).length - 1 ? 'border-b border-zinc-100' : ''} hover:bg-zinc-50/50 transition-colors`}
                >
                  <div className="h-9 w-9 rounded-lg flex flex-col items-center justify-center shrink-0 border text-zinc-600 bg-zinc-50 border-zinc-200">
                    <span className="text-[9px] font-bold leading-none">{new Date(n.due_date).toLocaleString('en-GB', { month: 'short' }).toUpperCase()}</span>
                    <span className="text-sm font-bold leading-tight tabular-nums">{new Date(n.due_date).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{n.subject ?? 'Untitled notice'}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{dueLabel(n.due_date)}</div>
                  </div>
                  <div className="text-[11px] text-zinc-500 shrink-0">{n.clients?.business_name}</div>
                </DockLink>
              ))}
            </div>
          </div>
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}

function StatCard({ label, value, icon, href, tone = 'default' }: { label: string; value: number | string; icon: React.ReactNode; href?: string; tone?: 'default' | 'warning' }) {
  const content = (
    <div className="flex items-center gap-3">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${tone === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-500'}`}>
        {icon}
      </div>
      <div>
        <div className={`text-2xl font-bold tabular-nums tracking-tight ${tone === 'warning' ? 'text-amber-600' : 'text-zinc-900'}`}>{value}</div>
        <div className="text-[11px] font-medium text-zinc-500">{label}</div>
      </div>
    </div>
  );

  const cls = 'tff-card p-3 transition-colors duration-200';

  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return <div className={cls}>{content}</div>;
}
