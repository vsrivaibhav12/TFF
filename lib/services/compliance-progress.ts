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
