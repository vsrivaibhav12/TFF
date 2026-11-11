// Pure arithmetic for the home dashboards. No data access: callers pass in the rows.

export type SlimTask = {
  id: string;
  assigned_to: string | null;
  due_date: string | null;
  is_blocked_on_client: boolean | null;
  updated_at: string | null;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export type WorkloadRow = { user_id: string; open: number; overdue: number; dueSoon: number; onTrack: number };

/** Open tasks per person, split by urgency. The busiest person comes first. Tasks with no assignee are left out. */
export function workloadByAssignee(tasks: SlimTask[], todayIso: string): WorkloadRow[] {
  const weekEnd = addDaysIso(todayIso, 7);
  const byUser = new Map<string, WorkloadRow>();
  for (const task of tasks) {
    if (!task.assigned_to) continue;
    const row = byUser.get(task.assigned_to) ?? { user_id: task.assigned_to, open: 0, overdue: 0, dueSoon: 0, onTrack: 0 };
    row.open += 1;
    if (task.due_date && task.due_date < todayIso) row.overdue += 1;
    else if (task.due_date && task.due_date <= weekEnd) row.dueSoon += 1;
    else row.onTrack += 1;
    byUser.set(task.assigned_to, row);
  }
  return [...byUser.values()].sort((a, b) => b.open - a.open);
}

/** Tasks waiting on a client, by days since the task last changed. Tasks with no update date count as the oldest. */
export function ageingBuckets(tasks: SlimTask[], todayIso: string): { d0_3: number; d4_7: number; d8_plus: number } {
  const out = { d0_3: 0, d4_7: 0, d8_plus: 0 };
  for (const task of tasks) {
    if (!task.is_blocked_on_client) continue;
    const days = task.updated_at ? daysBetween(task.updated_at.slice(0, 10), todayIso) : Number.POSITIVE_INFINITY;
    if (days <= 3) out.d0_3 += 1;
    else if (days <= 7) out.d4_7 += 1;
    else out.d8_plus += 1;
  }
  return out;
}

/** One entry per day starting today, with how many tasks fall due that day. */
export function weekStrip(tasks: SlimTask[], todayIso: string, days = 6): Array<{ date: string; weekday: string; count: number }> {
  const counts = new Map<string, number>();
  for (const task of tasks) if (task.due_date) counts.set(task.due_date, (counts.get(task.due_date) ?? 0) + 1);
  return Array.from({ length: days }, (_, i) => {
    const date = addDaysIso(todayIso, i);
    return { date, weekday: WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()], count: counts.get(date) ?? 0 };
  });
}

/** True for someone carrying well over the team average. Small numbers never count. */
export function isAboveAverage(open: number, averageOpen: number): boolean {
  return open >= averageOpen * 1.5 && open - averageOpen >= 5;
}

export function sumUnbilled(rows: Array<{ bill_amount: number | null }>): { count: number; amount: number } {
  return { count: rows.length, amount: rows.reduce((n, r) => n + (r.bill_amount ?? 0), 0) };
}

/** ₹1.84L, ₹2.5L, ₹1.2Cr; below a lakh the full figure with Indian grouping. */
export function formatInrCompact(amount: number): string {
  const trim = (n: number) => String(Math.round(n * 100) / 100);
  if (amount >= 10_000_000) return `₹${trim(amount / 10_000_000)}Cr`;
  if (amount >= 100_000) return `₹${trim(amount / 100_000)}L`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
