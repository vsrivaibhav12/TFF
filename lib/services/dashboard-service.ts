import {
  countActiveClients,
  countOpenTasks,
  countOverdueFilings,
  countActiveEngagements,
  listRecentTasks,
  listAttentionTasks,
  getPendingApprovals,
} from '@/lib/repositories/dashboard';
import { listRecentAuditLogs } from '@/lib/repositories/audit';
import { enrichTasksWithProgress } from '@/lib/repositories/tasks';
import { listAttendanceForDate } from '@/lib/repositories/attendance';
import { listTeamUsers } from '@/lib/repositories/clients';
import { todayIST } from '@/lib/utils';

export async function getAdminDashboardData() {
  const todayIso = todayIST();

  const [
    activeClients,
    openTasks,
    overdueTasks,
    rawRecentTasks,
    activeEngagements,
    attentionTasks,
    pendingApprovals,
    attendanceToday,
    teamMembers,
    recentAuditLogs,
  ] = await Promise.all([
    countActiveClients(),
    countOpenTasks(),
    countOverdueFilings(),
    listRecentTasks(5),
    countActiveEngagements(),
    listAttentionTasks(3),
    getPendingApprovals(),
    listAttendanceForDate(todayIso),
    listTeamUsers(),
    listRecentAuditLogs(8),
  ]);

  const recentTasks = await enrichTasksWithProgress(rawRecentTasks);

  const presentCount = attendanceToday.filter((a) => a.status === 'present').length;
  const onLeaveCount = attendanceToday.filter((a) => a.status === 'leave').length;
  const teamTotal = teamMembers.filter((m) => m.is_active).length;

  return {
    activeClients,
    openTasks,
    overdueTasks,
    activeEngagements,
    recentTasks,
    attentionTasks,
    pendingApprovals,
    attendanceToday: { presentCount, onLeaveCount, teamTotal },
    recentAuditLogs,
  };
}
