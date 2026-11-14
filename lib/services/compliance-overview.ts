// Pure: the compliance overview for one window. Each filing (a compliance sub-service) is counted from its
// tasks, plus the clients who are linked to it but have no task yet when that can be worked out.
import type { ProgressView } from '@/lib/services/compliance-progress';

export type OverviewTask = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  sub_service_id: string;
  sub_service_name: string;
  period_type: string | null;
  due_date: string;
  status: string;
  is_stuck: boolean;
  completed_date: string | null;
};

export type LinkedClient = {
  sub_service_id: string;
  sub_service_name: string;
  period_type: string | null;
  client_id: string;
  client_name: string;
};

export type StatusKey = 'done' | 'overdue' | 'waiting' | 'in_progress' | 'not_started' | 'missing';

export const STATUS_LABEL: Record<StatusKey, string> = {
  done: 'Done',
  overdue: 'Overdue',
  waiting: 'Waiting on client',
  in_progress: 'In progress',
  not_started: 'Not started',
  missing: 'No task yet',
};

/** The state of one task today. Overdue means past its due date and not completed, or stuck. */
export function taskStatusKey(t: Pick<OverviewTask, 'status' | 'is_stuck' | 'due_date'>, todayIso: string): StatusKey {
  if (t.status === 'completed') return 'done';
  if (t.is_stuck || t.due_date < todayIso) return 'overdue';
  if (t.status === 'blocked') return 'waiting';
  if (t.status === 'in_progress') return 'in_progress';
  return 'not_started';
}

/**
 * How many tasks one linked client should have in the window: one when the window is exactly one period of the service
 * (a monthly filing in a month, a quarterly one in a quarter, a yearly one in a financial year), otherwise unknown.
 * Longer windows would count periods that have not started yet, so they are left to the tasks that exist.
 */
export function expectedPerClient(periodType: string | null, view: ProgressView): number | null {
  const exact: Record<ProgressView, string> = { month: 'monthly', quarter: 'quarterly', year: 'yearly' };
  return periodType === exact[view] ? 1 : null;
}

export type FilingSummary = {
  id: string;
  name: string;
  periodType: string | null;
  tasks: number;
  done: number;
  inProgress: number;
  waiting: number;
  notStarted: number;
  overdue: number;
  /** Linked clients who should have a task in this window but do not. Null when it cannot be worked out. */
  missing: number | null;
  /** Their names. */
  missingClients: Array<{ id: string; name: string }>;
  /** Tasks plus missing: what the percentage is out of. */
  expected: number;
  pct: number;
  onTime: number;
  delayed: number;
};

export function buildFilings(tasks: OverviewTask[], linked: LinkedClient[], view: ProgressView, todayIso: string): FilingSummary[] {
  const by = new Map<string, FilingSummary>();
  const ensure = (id: string, name: string, periodType: string | null) => {
    let f = by.get(id);
    if (!f) {
      f = { id, name, periodType, tasks: 0, done: 0, inProgress: 0, waiting: 0, notStarted: 0, overdue: 0, missing: null, missingClients: [], expected: 0, pct: 0, onTime: 0, delayed: 0 };
      by.set(id, f);
    }
    return f;
  };

  const clientsWithTask = new Map<string, Set<string>>();
  for (const t of tasks) {
    const f = ensure(t.sub_service_id, t.sub_service_name, t.period_type);
    f.tasks += 1;
    const k = taskStatusKey(t, todayIso);
    if (k === 'done') {
      f.done += 1;
      if (t.completed_date) {
        if (t.completed_date.slice(0, 10) <= t.due_date) f.onTime += 1;
        else f.delayed += 1;
      }
    } else if (k === 'overdue') f.overdue += 1;
    else if (k === 'waiting') f.waiting += 1;
    else if (k === 'in_progress') f.inProgress += 1;
    else f.notStarted += 1;
    if (t.client_id) {
      const set = clientsWithTask.get(t.sub_service_id) ?? new Set<string>();
      set.add(t.client_id);
      clientsWithTask.set(t.sub_service_id, set);
    }
  }

  const linkedBy = new Map<string, LinkedClient[]>();
  for (const l of linked) {
    ensure(l.sub_service_id, l.sub_service_name, l.period_type);
    const arr = linkedBy.get(l.sub_service_id) ?? [];
    arr.push(l);
    linkedBy.set(l.sub_service_id, arr);
  }

  for (const f of by.values()) {
    const links = linkedBy.get(f.id) ?? [];
    const per = expectedPerClient(f.periodType, view);
    if (per !== null && links.length > 0) {
      const have = clientsWithTask.get(f.id) ?? new Set<string>();
      f.missingClients = links.filter((l) => !have.has(l.client_id)).map((l) => ({ id: l.client_id, name: l.client_name })).sort((a, b) => a.name.localeCompare(b.name));
      f.missing = f.missingClients.length;
    }
    f.expected = f.tasks + (f.missing ?? 0);
    f.pct = f.expected > 0 ? Math.round((f.done / f.expected) * 100) : 0;
  }

  // Least complete first, so the filings that need attention lead.
  return [...by.values()].filter((f) => f.expected > 0).sort((a, b) => a.pct - b.pct || b.expected - a.expected || a.name.localeCompare(b.name));
}

export type OverviewTotals = { expected: number; done: number; pct: number; inProgress: number; overdue: number; missing: number; onTimePct: number | null };

export function totalsOf(filings: FilingSummary[]): OverviewTotals {
  const expected = filings.reduce((n, f) => n + f.expected, 0);
  const done = filings.reduce((n, f) => n + f.done, 0);
  const onTime = filings.reduce((n, f) => n + f.onTime, 0);
  const delayed = filings.reduce((n, f) => n + f.delayed, 0);
  return {
    expected,
    done,
    pct: expected > 0 ? Math.round((done / expected) * 100) : 0,
    inProgress: filings.reduce((n, f) => n + f.inProgress + f.waiting + f.notStarted, 0),
    overdue: filings.reduce((n, f) => n + f.overdue, 0),
    missing: filings.reduce((n, f) => n + (f.missing ?? 0), 0),
    onTimePct: onTime + delayed > 0 ? Math.round((onTime / (onTime + delayed)) * 100) : null,
  };
}

export type ClientRow = {
  key: string;
  task_id: string | null;
  client_id: string | null;
  client_name: string;
  filing_id: string;
  filing_name: string;
  due_date: string | null;
  status: StatusKey;
  assignee_name: string | null;
  completed_date: string | null;
};

/** One row per task, plus one "no task yet" row for each client that should have one. Worst first. */
export function buildClientRows(tasks: OverviewTask[], filings: FilingSummary[], todayIso: string, filingId?: string | null): ClientRow[] {
  const rows: ClientRow[] = [];
  for (const t of tasks) {
    if (filingId && t.sub_service_id !== filingId) continue;
    rows.push({
      key: t.id,
      task_id: t.id,
      client_id: t.client_id,
      client_name: t.client_name ?? 'Unknown client',
      filing_id: t.sub_service_id,
      filing_name: t.sub_service_name,
      due_date: t.due_date,
      status: taskStatusKey(t, todayIso),
      assignee_name: t.assignee_name,
      completed_date: t.completed_date,
    });
  }
  for (const f of filings) {
    if (filingId && f.id !== filingId) continue;
    for (const c of f.missingClients) {
      rows.push({ key: `missing:${f.id}:${c.id}`, task_id: null, client_id: c.id, client_name: c.name, filing_id: f.id, filing_name: f.name, due_date: null, status: 'missing', assignee_name: null, completed_date: null });
    }
  }
  const rank: Record<StatusKey, number> = { overdue: 0, missing: 1, waiting: 2, not_started: 3, in_progress: 4, done: 5 };
  return rows.sort((a, b) => rank[a.status] - rank[b.status] || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || a.client_name.localeCompare(b.client_name));
}
