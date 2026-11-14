// Pure: completion of each filing (GSTR-1, GSTR-3B, TDS...) for the filings due in a month or a fiscal quarter.
// A filing is complete when its task is completed. Dismissed events are not counted.

export type ProgressView = 'month' | 'quarter';

export type ProgressEvent = {
  rule_code: string;
  rule_name: string;
  due_date: string; // YYYY-MM-DD
  status: string;
  task_id: string | null;
  task_status: string | null;
};

export type ProgressRow = {
  rule_code: string;
  rule_name: string;
  total: number;
  completed: number;
  inProgress: number; // task exists, not completed, not past due
  notStarted: number; // no task yet, not past due
  overdue: number; // past due and not completed
  pct: number; // whole-number completion percentage
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(v: string | undefined | null): v is string {
  return !!v && MONTH_RE.test(v);
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

/** Inclusive ISO date bounds of the month, or of the fiscal quarter (Apr-Jun, Jul-Sep, Oct-Dec, Jan-Mar) containing it. */
export function periodBounds(view: ProgressView, monthKey: string): { from: string; to: string } {
  const [y, m] = monthKey.split('-').map(Number);
  let startMonth = m;
  let months = 1;
  if (view === 'quarter') {
    startMonth = m >= 4 ? 4 + Math.floor((m - 4) / 3) * 3 : 1;
    months = 3;
  }
  const from = `${y}-${String(startMonth).padStart(2, '0')}-01`;
  const endKey = shiftMonth(`${y}-${String(startMonth).padStart(2, '0')}`, months - 1);
  const [ey, em] = endKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(ey, em, 0)).getUTCDate();
  return { from, to: `${endKey}-${String(lastDay).padStart(2, '0')}` };
}

export function periodLabel(view: ProgressView, monthKey: string): string {
  const { from, to } = periodBounds(view, monthKey);
  if (view === 'month') return new Date(`${from}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const short = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
  return `${short(from)} to ${short(to)} ${to.slice(0, 4)}`;
}

export function summariseProgress(events: ProgressEvent[], todayIso: string): ProgressRow[] {
  const by = new Map<string, ProgressRow>();
  for (const e of events) {
    if (e.status === 'dismissed') continue;
    let row = by.get(e.rule_code);
    if (!row) {
      row = { rule_code: e.rule_code, rule_name: e.rule_name, total: 0, completed: 0, inProgress: 0, notStarted: 0, overdue: 0, pct: 0 };
      by.set(e.rule_code, row);
    }
    row.total += 1;
    const pastDue = e.due_date < todayIso;
    if (e.task_status === 'completed') row.completed += 1;
    else if (pastDue) row.overdue += 1;
    else if (e.task_id) row.inProgress += 1;
    else row.notStarted += 1;
  }
  const rows = [...by.values()];
  for (const r of rows) r.pct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
  // Least complete first, so the filings that need attention lead.
  return rows.sort((a, b) => a.pct - b.pct || b.total - a.total || a.rule_name.localeCompare(b.rule_name));
}

// ---- From tasks -------------------------------------------------------------------------------------
// A compliance item is a task whose sub-service is flagged as compliance, however the task was created.

export type ComplianceTask = {
  id: string;
  client_id: string | null;
  sub_service_id: string;
  sub_service_name: string;
  due_date: string; // YYYY-MM-DD
  status: string;
  is_stuck: boolean;
  completed_date: string | null; // YYYY-MM-DD or ISO timestamp
};

/** Shapes tasks for summariseProgress: one row per rule is one sub-service. */
export function tasksToProgressEvents(tasks: ComplianceTask[]): ProgressEvent[] {
  return tasks.map((t) => ({
    rule_code: t.sub_service_id,
    rule_name: t.sub_service_name,
    due_date: t.due_date,
    status: 'task',
    task_id: t.id,
    task_status: t.status,
  }));
}

export type FilingPeriodRow = {
  key: string;
  sub_service_id: string;
  name: string;
  month: string; // YYYY-MM of the due date
  first_due: string;
  total: number;
  done: number;
  pending: number;
  overdue: number;
  onTime: number;
  delayed: number;
};

/** One row per sub-service per due month, with on-time and delayed counts for finished tasks. */
export function summariseByDueMonth(tasks: ComplianceTask[], todayIso: string): FilingPeriodRow[] {
  const by = new Map<string, FilingPeriodRow>();
  for (const t of tasks) {
    const month = t.due_date.slice(0, 7);
    const key = `${t.sub_service_id}::${month}`;
    let row = by.get(key);
    if (!row) {
      row = { key, sub_service_id: t.sub_service_id, name: t.sub_service_name, month, first_due: t.due_date, total: 0, done: 0, pending: 0, overdue: 0, onTime: 0, delayed: 0 };
      by.set(key, row);
    }
    row.total += 1;
    if (t.due_date < row.first_due) row.first_due = t.due_date;
    if (t.status === 'completed') {
      row.done += 1;
      if (t.completed_date) {
        if (t.completed_date.slice(0, 10) <= t.due_date) row.onTime += 1;
        else row.delayed += 1;
      }
    } else if (t.is_stuck || t.due_date < todayIso) row.overdue += 1;
    else row.pending += 1;
  }
  return [...by.values()].sort((a, b) => a.first_due.localeCompare(b.first_due) || a.name.localeCompare(b.name));
}

export type UpcomingFiling = { key: string; name: string; due_date: string; filed: number; total: number; overdue: number };

/** Filings falling due from today to toIso, one row per sub-service per due date, soonest first. */
export function upcomingFilings(tasks: ComplianceTask[], todayIso: string, toIso: string, limit = 6): UpcomingFiling[] {
  const by = new Map<string, UpcomingFiling>();
  for (const t of tasks) {
    if (t.due_date < todayIso || t.due_date > toIso) continue;
    const key = `${t.sub_service_id}::${t.due_date}`;
    let row = by.get(key);
    if (!row) {
      row = { key, name: t.sub_service_name, due_date: t.due_date, filed: 0, total: 0, overdue: 0 };
      by.set(key, row);
    }
    row.total += 1;
    if (t.status === 'completed') row.filed += 1;
    else if (t.is_stuck) row.overdue += 1;
  }
  return [...by.values()].sort((a, b) => a.due_date.localeCompare(b.due_date) || a.name.localeCompare(b.name)).slice(0, limit);
}
