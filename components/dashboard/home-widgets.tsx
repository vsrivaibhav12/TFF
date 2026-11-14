import Link from 'next/link';
import { formatDateIST, cn } from '@/lib/utils';

const BAR = 'h-2 rounded-full bg-zinc-100 overflow-hidden flex gap-0.5';

/** Filed clients out of linked clients for each statutory return coming up. */
export function DeadlineProgress({
  rows,
  href,
}: {
  rows: Array<{ key: string; name: string; period: string; due_date: string; filed: number; total: number; overdue: number }>;
  href: string;
}) {
  return (
    <section className="tff-card p-4 space-y-3" data-testid="deadline-progress">
      <div className="flex items-center justify-between">
        <h3 className="tff-section-title">Statutory deadlines</h3>
        <span className="text-xs text-zinc-500">Done out of tasks created, next 14 days</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No filing deadlines in the next 14 days.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const filedPct = r.total > 0 ? (r.filed / r.total) * 100 : 0;
            const overduePct = r.total > 0 ? (r.overdue / r.total) * 100 : 0;
            return (
              <li key={r.key}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-zinc-900 truncate">
                    {r.name}{r.period ? <span className="text-zinc-500"> · {r.period}</span> : null}
                    <span className="ml-2 text-xs text-zinc-500">due {formatDateIST(r.due_date)}</span>
                  </span>
                  <span className="text-xs text-zinc-500 tabular-nums whitespace-nowrap">{r.filed} of {r.total} filed</span>
                </div>
                <div className={cn(BAR, 'mt-1')} role="img" aria-label={`${r.filed} of ${r.total} filed, ${r.overdue} overdue`}>
                  <div className="bg-teal-600" style={{ width: `${filedPct}%` }} />
                  <div className="bg-red-600" style={{ width: `${overduePct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link href={href} className="text-xs text-teal-700 hover:underline font-medium">Open compliance</Link>
    </section>
  );
}

export type WorkloadRowView = { user_id: string; name: string; open: number; overdue: number; dueSoon: number; onTrack: number; aboveAverage: boolean };

/** Open tasks per person, split into on track, due this week and overdue. */
export function WorkloadBars({ rows, title = 'Team workload', tasksHref }: { rows: WorkloadRowView[]; title?: string; tasksHref: string }) {
  const max = Math.max(1, ...rows.map((r) => r.open));
  return (
    <section className="tff-card p-4 space-y-3" data-testid="workload-bars">
      <div className="flex items-center justify-between">
        <h3 className="tff-section-title">{title}</h3>
        <span className="text-xs text-zinc-500">Open tasks per person</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No open tasks are assigned.</p>
      ) : (
        <ul className="space-y-3">
          {rows.slice(0, 8).map((r) => (
            <li key={r.user_id}>
              <div className="flex items-baseline justify-between text-sm">
                <Link href={`${tasksHref}?assigned=${r.user_id}`} className="text-zinc-900 hover:text-teal-700 truncate">{r.name}</Link>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {r.open} open{r.aboveAverage ? ' · above the team average' : ''}
                </span>
              </div>
              <div className={cn(BAR, 'mt-1')} role="img" aria-label={`${r.onTrack} on track, ${r.dueSoon} due this week, ${r.overdue} overdue`}>
                <div className="bg-teal-600" style={{ width: `${(r.onTrack / max) * 100}%` }} />
                <div className="bg-amber-500" style={{ width: `${(r.dueSoon / max) * 100}%` }} />
                <div className="bg-red-600" style={{ width: `${(r.overdue / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-4 text-xs text-zinc-500">
        <span><span className="inline-block h-2 w-2 rounded-sm bg-teal-600 mr-1" />On track</span>
        <span><span className="inline-block h-2 w-2 rounded-sm bg-amber-500 mr-1" />Due this week</span>
        <span><span className="inline-block h-2 w-2 rounded-sm bg-red-600 mr-1" />Overdue</span>
      </div>
    </section>
  );
}

/** Tasks waiting on a client, by how long since they last changed. */
export function AgeingBars({ buckets, href }: { buckets: { d0_3: number; d4_7: number; d8_plus: number }; href: string }) {
  const items = [
    { label: '0-3 days', n: buckets.d0_3, color: 'bg-teal-600' },
    { label: '4-7 days', n: buckets.d4_7, color: 'bg-amber-500' },
    { label: '8+ days', n: buckets.d8_plus, color: 'bg-red-600' },
  ];
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <section className="tff-card p-4 space-y-3" data-testid="ageing-bars">
      <div className="flex items-center justify-between">
        <h3 className="tff-section-title">Waiting on client</h3>
        <span className="text-xs text-zinc-500">Days since last update</span>
      </div>
      <div className="flex items-end gap-3 h-24">
        {items.map((i) => (
          <div key={i.label} className="flex-1 flex flex-col justify-end h-full">
            <div className={cn('rounded-t', i.color)} style={{ height: `${(i.n / max) * 100}%`, minHeight: i.n > 0 ? 4 : 0 }} />
          </div>
        ))}
      </div>
      <div className="flex gap-3 text-xs text-center text-zinc-500">
        {items.map((i) => (
          <div key={i.label} className="flex-1">{i.label}<div className="text-sm font-medium text-zinc-900 tabular-nums">{i.n}</div></div>
        ))}
      </div>
      <Link href={href} className="text-xs text-teal-700 hover:underline font-medium">See these tasks</Link>
    </section>
  );
}

/** Tasks falling due on each of the next few days. */
export function WeekStrip({ days, href }: { days: Array<{ date: string; weekday: string; count: number }>; href: string }) {
  // The base link may already carry a query (for example the person's own tasks).
  const joiner = href.includes('?') ? '&' : '?';
  const dayHref = (date: string) => href + joiner + 'due_from=' + date + '&due_to=' + date;
  return (
    <section className="tff-card p-4 space-y-3" data-testid="week-strip">
      <div className="flex items-center justify-between">
        <h3 className="tff-section-title">My week</h3>
        <span className="text-xs text-zinc-500">Tasks by due date</span>
      </div>
      <div className="flex gap-2">
        {days.map((d, i) => (
          <Link
            key={d.date}
            href={dayHref(d.date)}
            className={cn('flex-1 rounded-lg bg-zinc-50 px-1 py-2 text-center text-xs text-zinc-500 hover:bg-zinc-100', i === 0 && 'ring-1 ring-teal-600')}
          >
            <div className="text-lg font-medium text-zinc-900 tabular-nums leading-tight">{d.count}</div>
            {d.weekday}
          </Link>
        ))}
      </div>
    </section>
  );
}

function daysSince(iso: string | null, todayIso: string): number | null {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.parse(`${todayIso}T00:00:00Z`) - Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)) / 86_400_000));
}

/** This person's tasks waiting on a client, with how long they have waited. */
export function WaitingList({ tasks, todayIso, href }: { tasks: Array<{ id: string; title: string; updated_at: string | null; client_name: string | null }>; todayIso: string; href: string }) {
  return (
    <section className="tff-card p-4 space-y-2" data-testid="waiting-list">
      <div className="flex items-center justify-between">
        <h3 className="tff-section-title">Waiting on client</h3>
        <span className="text-xs text-zinc-500">Days since last update</span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing is waiting on a client.</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {tasks.map((t) => {
            const d = daysSince(t.updated_at, todayIso);
            return (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-zinc-900">{t.title}</span>
                  {t.client_name && <span className="block truncate text-xs text-zinc-500">{t.client_name}</span>}
                </span>
                <span className={cn('text-xs tabular-nums whitespace-nowrap rounded-full px-2 py-0.5', d !== null && d >= 8 ? 'bg-red-50 text-red-700' : d !== null && d >= 4 ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-600')}>
                  {d === null ? 'No date' : `${d} day${d === 1 ? '' : 's'}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Link href={href} className="text-xs text-teal-700 hover:underline font-medium">See all</Link>
    </section>
  );
}
