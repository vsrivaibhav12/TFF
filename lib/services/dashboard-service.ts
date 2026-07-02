import {
  countActiveClients,
  countOpenTasks,
  countOverdueFilings,
  countActiveEngagements,
  listRecentTasks,
  listUpcomingDeadlines,
  listUpcomingNotices,
  listUrgentNotices,
  listAttentionTasks,
  getComplianceStatusSummary,
  getPendingApprovals,
  countOpenQueries,
  listOpenQueries,
} from '@/lib/repositories/dashboard';
import { listRecentAuditLogs } from '@/lib/repositories/audit';
import { enrichTasksWithProgress } from '@/lib/repositories/tasks';
import { listAttendanceForDate } from '@/lib/repositories/attendance';
import { listTeamUsers } from '@/lib/repositories/clients';
import { todayIST } from '@/lib/utils';

export async function getAdminDashboardData() {
  const todayIso = todayIST();
  const weekAhead = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() + 7 * 86_400_000));
  const weekAgo = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() - 7 * 86_400_000));

  const [
    activeClients,
    openTasks,
    overdueTasks,
    rawRecentTasks,
    upcomingDeadlines,
    activeEngagements,
    upcomingNotices,
    attentionTasks,
    complianceSummary,
    pendingApprovals,
    attendanceToday,
    teamMembers,
    openQueriesCount,
    openQueries,
    recentAuditLogs,
  ] = await Promise.all([
    countActiveClients(),
    countOpenTasks(),
    countOverdueFilings(),
    listRecentTasks(5),
    listUpcomingDeadlines(todayIso, weekAhead, 6),
    countActiveEngagements(),
    listUpcomingNotices(todayIso, 6),
    listAttentionTasks(3),
    getComplianceStatusSummary(),
    getPendingApprovals(),
    listAttendanceForDate(todayIso),
    listTeamUsers(),
    countOpenQueries(),
    listOpenQueries(3),
    listRecentAuditLogs(8),
  ]);

  const [recentTasks, openNoticesCount] = await Promise.all([
    enrichTasksWithProgress(rawRecentTasks),
    listUrgentNotices(3).then((n) => n.length),
  ]);

  const presentCount = attendanceToday.filter((a) => a.status === 'present').length;
  const onLeaveCount = attendanceToday.filter((a) => a.status === 'leave').length;
  const teamTotal = teamMembers.filter((m) => m.is_active).length;

  return {
    activeClients,
    openTasks,
    overdueTasks,
    activeEngagements,
    recentTasks,
    upcomingDeadlines,
    upcomingNotices,
    attentionTasks,
    complianceSummary,
    pendingApprovals,
    attendanceToday: { presentCount, onLeaveCount, teamTotal },
    openNoticesCount,
    openQueriesCount,
    openQueries,
    recentAuditLogs,
  };
}
