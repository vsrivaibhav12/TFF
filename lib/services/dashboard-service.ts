import {
  countActiveClients,
  countOpenTasks,
  countOverdueFilings,
  countActiveEngagements,
  listRecentTasks,
  listAttentionTasks,
  getPendingApprovals,
  resolveAuditEntityLabels,
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
    countOverdueFilings(todayIso),
    listRecentTasks(5),
    countActiveEngagements(),
    listAttentionTasks(todayIso, 4),
    getPendingApprovals(),
    listAttendanceForDate(todayIso),
    listTeamUsers(),
    listRecentAuditLogs(8),
  ]);

  const [recentTasks, entityLabels] = await Promise.all([
    enrichTasksWithProgress(rawRecentTasks),
    resolveAuditEntityLabels(recentAuditLogs),
  ]);
  // Name the thing each audit row changed, so the feed reads "Updated task: GSTR-1 · Acme".
  const auditWithLabels = recentAuditLogs.map((log: any) => ({
    ...log,
    entity_label: entityLabels[`${log.entity_type}:${log.entity_id}`] ?? null,
  }));

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
    recentAuditLogs: auditWithLabels,
  };
}
