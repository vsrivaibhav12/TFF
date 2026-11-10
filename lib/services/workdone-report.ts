export interface WorkDoneEntry {
  id: string;
  work_date: string;
  duration_minutes: number;
  note: string | null;
  entry_method: string | null;
  user_id: string;
  user_name: string;
  client_id: string | null;
  client_name: string;
  task_id: string | null;
  task_title: string;
}

export interface Bucket {
  key: string;
  name: string;
  minutes: number;
  entries: number;
}

export interface WorkDoneSummary {
  total_minutes: number;
  entries: number;
  active_days: number;
  avg_minutes_per_active_day: number;
  members: number;
  clients: number;
  by_member: Bucket[];
  by_client: Bucket[];
  by_task: Bucket[];
  by_day: { date: string; minutes: number }[];
}

function bump(map: Map<string, Bucket>, key: string, name: string, minutes: number) {
  const b = map.get(key);
  if (b) {
    b.minutes += minutes;
    b.entries += 1;
  } else {
    map.set(key, { key, name, minutes, entries: 1 });
  }
}

const sortDesc = (a: Bucket, b: Bucket) => b.minutes - a.minutes || a.name.localeCompare(b.name);

export function summariseWorkDone(rows: WorkDoneEntry[]): WorkDoneSummary {
  const members = new Map<string, Bucket>();
  const clients = new Map<string, Bucket>();
  const tasks = new Map<string, Bucket>();
  const days = new Map<string, number>();
  let total = 0;

  for (const r of rows) {
    total += r.duration_minutes;
    bump(members, r.user_id, r.user_name, r.duration_minutes);
    bump(clients, r.client_id ?? 'none', r.client_name, r.duration_minutes);
    if (r.task_id) bump(tasks, r.task_id, r.task_title, r.duration_minutes);
    days.set(r.work_date, (days.get(r.work_date) ?? 0) + r.duration_minutes);
  }

  return {
    total_minutes: total,
    entries: rows.length,
    active_days: days.size,
    avg_minutes_per_active_day: days.size > 0 ? Math.round(total / days.size) : 0,
    members: members.size,
    clients: [...clients.keys()].filter((k) => k !== 'none').length,
    by_member: [...members.values()].sort(sortDesc),
    by_client: [...clients.values()].sort(sortDesc),
    by_task: [...tasks.values()].sort(sortDesc).slice(0, 15),
    by_day: [...days.entries()].map(([date, minutes]) => ({ date, minutes })).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** "2h 30m" style duration. */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
