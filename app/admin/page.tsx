import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { todayIST, timeAgo } from '@/lib/utils';
import Link from 'next/link';
import {
  Users,
  AlertTriangle,
  Briefcase,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  Inbox,
  CalendarX,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container';
import { PriorityList } from '@/components/dashboard/priority-list';
import { DeadlineTimeline } from '@/components/dashboard/deadline-timeline';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { NeedsAttentionHub } from '@/components/dashboard/needs-attention-hub';
import { BusinessPulse } from '@/components/dashboard/business-pulse';
import { AdminQuickActions } from '@/components/dashboard/admin-quick-actions';
import { enrichTasksWithProgress } from '@/lib/repositories/tasks';
import { AdminPayrollPrompt } from '@/components/dashboard/smart-prompts';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireRole('admin');
  const sb = createClient();

  const todayIso = todayIST();
  const weekAhead = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() + 7 * 86_400_000));

  // Core firm metrics
  const [
    { count: activeClients },
    { count: openTasks },
    { count: overdueTasks },
    { data: rawRecentTasks },
    { data: upcomingDeadlines },
    { data: recentActivity },
    { count: activeEngagements },
    { data: upcomingNotices },
  ] = await Promise.all([
    sb.from('clients').select('id', { head: true, count: 'exact' }).eq('is_deleted', false),
    sb.from('tasks').select('id', { head: true, count: 'exact' }).eq('is_deleted', false).in('status', ['pending', 'in_progress']),
    sb.from('compliance_status').select('id', { head: true, count: 'exact' }).eq('is_overdue', true),
    sb.from('tasks').select('id, title, status, priority, due_date, clients!tasks_client_id_fkey(id, business_name), assigned_to, users_profile!tasks_assigned_to_fkey(full_name)').eq('is_deleted', false).in('status', ['pending', 'in_progress']).order('due_date').limit(5),
    sb.from('compliance_calendar_events').select('id, client_id, rule_code, period_label, due_date, status, clients!compliance_calendar_events_client_id_fkey(business_name), compliance_calendar_rules!compliance_calendar_events_rule_id_fkey(display_name, service_kind)').gte('due_date', todayIso).lte('due_date', weekAhead).order('due_date', { ascending: true }).limit(6),
    sb.from('global_audit_log').select('id, action, entity_type, entity_id, details, performed_at, performed_by:global_audit_log_performed_by_fkey(full_name, email)').order('performed_at', { ascending: false }).limit(6),
    sb.from('client_sub_services').select('id', { head: true, count: 'exact' }).eq('is_active', true),
    sb.from('notices').select('id, subject, notice_type, status, due_date, clients!notices_client_id_fkey(business_name)').gte('due_date', todayIso).order('due_date', { ascending: true }).limit(6),
  ]);

  const recentTasks = await enrichTasksWithProgress(rawRecentTasks ?? []);

  // Compliance data for health score
  const { data: complianceData } = await sb
    .from('compliance_status')
    .select('status')
    .limit(500);

  const filedCount = complianceData?.filter((r: any) => r.status === 'filed').length ?? 0;
  const pendingCount = complianceData?.filter((r: any) => r.status === 'pending').length ?? 0;
  const overdueCount = complianceData?.filter((r: any) => r.status === 'overdue').length ?? 0;
  const totalCompliance = filedCount + pendingCount + overdueCount;
  const complianceRate = totalCompliance > 0 ? Math.round((filedCount / totalCompliance) * 100) : 0;

  // Pending approvals (leave + permission + timesheet)
  const [
    { count: pendingLeaveCount },
    { count: pendingPermissionCount },
    { count: pendingTimesheetCount },
  ] = await Promise.all([
    sb.from('leave_requests').select('id', { head: true, count: 'exact' }).eq('status', 'pending'),
    sb.from('permission_requests').select('id', { head: true, count: 'exact' }).eq('status', 'pending'),
    sb.from('weekly_timesheet_submissions').select('id', { head: true, count: 'exact' }).eq('status', 'submitted'),
  ]);
  const totalPendingApprovals = (pendingLeaveCount ?? 0) + (pendingPermissionCount ?? 0) + (pendingTimesheetCount ?? 0);

  // Urgent alerts
  const { data: urgentNotices } = await sb
    .from('notices')
    .select('id, subject, notice_type, status, due_date, clients!notices_client_id_fkey(business_name)')
    .eq('status', 'open')
    .order('due_date')
    .limit(3);

  const openNoticesCount = urgentNotices?.length ?? 0;

  // Health score
  const healthMetrics: { label: string; status: 'good' | 'at_risk' | 'poor' }[] = [
    { label: 'Compliance', status: complianceRate >= 80 ? 'good' : complianceRate >= 60 ? 'at_risk' : 'poor' },
    { label: 'On-time delivery', status: (overdueTasks ?? 0) === 0 ? 'good' : (overdueTasks ?? 0) < 5 ? 'at_risk' : 'poor' },
    { label: 'Open notices', status: openNoticesCount === 0 ? 'good' : openNoticesCount < 3 ? 'at_risk' : 'poor' },
    { label: 'Workload', status: (openTasks ?? 0) < 20 ? 'good' : (openTasks ?? 0) < 50 ? 'at_risk' : 'poor' },
  ];
  const healthScore = Math.max(0, Math.min(100, complianceRate - ((overdueTasks ?? 0) * 2) - (openNoticesCount * 5)));

  // Today's Pulse alerts
  const pulseAlerts = [
    ...totalPendingApprovals > 0 ? [{ text: `${totalPendingApprovals} pending approval${totalPendingApprovals !== 1 ? 's' : ''}`, href: '/admin/approvals', color: 'bg-teal-50 text-teal-700 border-teal-200' }] : [],
    ...(overdueTasks ?? 0) > 0 ? [{ text: `${overdueTasks} overdue filing${(overdueTasks ?? 0) !== 1 ? 's' : ''}`, href: '/admin/tasks', color: 'bg-red-50 text-red-700 border-red-200' }] : [],
    ...(openNoticesCount > 0) ? [{ text: `${openNoticesCount} open notice${openNoticesCount !== 1 ? 's' : ''}`, href: '/admin/tasks', color: 'bg-amber-50 text-amber-700 border-amber-200' }] : [],
    ...(upcomingDeadlines ?? []).length > 0 ? [{ text: `${upcomingDeadlines?.length} deadline${(upcomingDeadlines?.length ?? 0) !== 1 ? 's' : ''} this week`, href: '/admin/tasks', color: 'bg-blue-50 text-blue-700 border-blue-200' }] : [],
  ];

  return (
    <StaggerContainer className="space-y-6">
      <AdminPayrollPrompt />
      {/* Header */}
      <StaggerItem>
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-stone-900">Firm overview</h1>
          <p className="text-sm text-stone-500 mt-1">Everything you need to run the firm — at a glance.</p>
        </div>
      </StaggerItem>

      {/* Quick Actions */}
      <StaggerItem>
        <AdminQuickActions />
      </StaggerItem>

      {/* Today's Pulse */}
      {pulseAlerts.length > 0 && (
        <StaggerItem>
          <div className="flex items-center gap-3 flex-wrap">
            {pulseAlerts.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border ${a.color} hover:shadow-sm transition-all`}
              >
                <AlertTriangle className="h-4 w-4" />
                {a.text}
              </Link>
            ))}
          </div>
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

      {/* Widget Grid */}
      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <PriorityList tasks={recentTasks as any} href="/admin/tasks" />
          </div>
          <div className="lg:col-span-3">
            <DeadlineTimeline deadlines={(upcomingDeadlines ?? []) as any} />
          </div>
          <div className="lg:col-span-5">
            <NeedsAttentionHub items={(recentActivity ?? []) as any} />
          </div>
        </div>
      </StaggerItem>

      {/* Notice deadlines */}
      {(upcomingNotices ?? []).length > 0 && (
        <StaggerItem>
          <div className="tff-card tff-card-pad">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-stone-900 tracking-tight">Notice deadlines</h3>
                <p className="text-xs text-stone-500 mt-0.5">Upcoming notice due dates</p>
              </div>
              <Link href="/admin/notices" className="text-xs text-teal-700 hover:underline font-medium inline-flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(upcomingNotices ?? []).map((n: any) => (
                <Link
                  key={n.id}
                  href={`/admin/notices/${n.id}`}
                  className="flex items-center gap-3 rounded-xl border border-stone-100 p-3 hover:border-teal-200 hover:bg-teal-50/30 transition-all"
                >
                  <div className="h-10 w-10 rounded-lg flex flex-col items-center justify-center shrink-0 border text-stone-600 bg-stone-50 border-stone-200">
                    <span className="text-[9px] font-bold leading-none">{new Date(n.due_date).toLocaleString('en-GB', { month: 'short' }).toUpperCase()}</span>
                    <span className="text-sm font-bold leading-tight">{new Date(n.due_date).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{n.subject ?? 'Untitled notice'}</div>
                    <div className="text-xs text-stone-500">{n.clients?.business_name} · {n.notice_type}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </StaggerItem>
      )}

      {/* Bottom Row: Business Pulse */}
      <div className="grid grid-cols-1 gap-6">
        <StaggerItem>
          <BusinessPulse />
        </StaggerItem>
      </div>
    </StaggerContainer>
  );
}

function StatCard({ label, value, icon, href, tone = 'default' }: { label: string; value: number; icon: React.ReactNode; href?: string; tone?: 'default' | 'warning' }) {
  const content = (
    <>
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tone === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-stone-100 text-stone-500'}`}>
        {icon}
      </div>
      <div className="mt-3">
        <div className={`text-2xl font-bold tabular-nums tracking-tight ${tone === 'warning' ? 'text-amber-600' : 'text-stone-900'}`}>{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mt-1">{label}</div>
      </div>
    </>
  );

  const cls = 'tff-card p-5 transition-all duration-200 hover:shadow-card-hover';
  const style = {};

  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {content}
      </Link>
    );
  }
  return <div className={cls} style={style}>{content}</div>;
}
