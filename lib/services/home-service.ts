import { listTeamUsers } from '@/lib/repositories/clients';
import { countTasks } from '@/lib/repositories/tasks';
import { listOpenSlimTasks, listUnbilledCompleted, listWaitingTasks, minutesLoggedOn } from '@/lib/repositories/home';
import {
  addDaysIso,
  ageingBuckets,
  isAboveAverage,
  sumUnbilled,
  weekStrip,
  workloadByAssignee,
} from '@/lib/services/home-metrics';
import { todayIST } from '@/lib/utils';

export type WorkloadView = {
  user_id: string;
  name: string;
  open: number;
  overdue: number;
  dueSoon: number;
  onTrack: number;
  aboveAverage: boolean;
};

async function namedWorkload(tasks: Awaited<ReturnType<typeof listOpenSlimTasks>>, todayIso: string, onlyUsers?: string[]): Promise<WorkloadView[]> {
  const [rows, team] = await Promise.all([Promise.resolve(workloadByAssignee(tasks, todayIso)), listTeamUsers()]);
  const names = new Map((team as Array<{ id: string; full_name: string }>).map((u) => [u.id, u.full_name]));
  const wanted = onlyUsers ? new Set(onlyUsers) : null;
  const shown = rows.filter((r) => !wanted || wanted.has(r.user_id));
  // People with no open tasks still belong in a team view.
  if (wanted) for (const id of wanted) if (!shown.some((r) => r.user_id === id)) shown.push({ user_id: id, open: 0, overdue: 0, dueSoon: 0, onTrack: 0 });
  const average = shown.length > 0 ? shown.reduce((n, r) => n + r.open, 0) / shown.length : 0;
  return shown
    .map((r) => ({ ...r, name: names.get(r.user_id) ?? 'Team member', aboveAverage: isAboveAverage(r.open, average) }))
    .sort((a, b) => b.open - a.open);
}

/** Numbers for the admin home that the older dashboard query does not provide. */
export async function getAdminHome() {
  const todayIso = todayIST();
  const [tasks, unbilledRows] = await Promise.all([listOpenSlimTasks(), listUnbilledCompleted()]);
  const weekEnd = addDaysIso(todayIso, 7);
  const dueThisWeek = tasks.filter((t) => t.due_date && t.due_date >= todayIso && t.due_date <= weekEnd).length;
  const overdue = tasks.filter((t) => t.due_date && t.due_date < todayIso).length;
  const ageing = ageingBuckets(tasks, todayIso);
  return {
    todayIso,
    open: tasks.length,
    dueThisWeek,
    overdue,
    waiting: ageing.d0_3 + ageing.d4_7 + ageing.d8_plus,
    ageing,
    unbilled: sumUnbilled(unbilledRows),
    workload: await namedWorkload(tasks, todayIso),
  };
}

/** What a team member sees about their own week. */
export async function getMemberHome(userId: string) {
  const todayIso = todayIST();
  const [tasks, waiting, minutes] = await Promise.all([
    listOpenSlimTasks({ assignedTo: userId }),
    listWaitingTasks(userId),
    minutesLoggedOn(userId, todayIso),
  ]);
  return { todayIso, strip: weekStrip(tasks, todayIso, 6), waiting, minutesToday: minutes };
}

/** What a manager sees about the people who report to them. */
export async function getManagerHome(reportIds: string[], canVerify: boolean) {
  const todayIso = todayIST();
  const tasks = await listOpenSlimTasks({ assignedToAny: reportIds });
  const weekEnd = addDaysIso(todayIso, 7);
  const [workload, toVerify] = await Promise.all([
    namedWorkload(tasks, todayIso, reportIds),
    canVerify ? countTasks({ status: ['completed'], verificationStatus: 'pending' }) : Promise.resolve(0),
  ]);
  return {
    overdue: tasks.filter((t) => t.due_date && t.due_date < todayIso).length,
    dueThisWeek: tasks.filter((t) => t.due_date && t.due_date >= todayIso && t.due_date <= weekEnd).length,
    workload,
    toVerify,
  };
}
