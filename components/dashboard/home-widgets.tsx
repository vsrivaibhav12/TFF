import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Filings falling due soon: a date block, what is due, how many are done, and one status chip. */
export function DeadlineProgress({
  rows,
  href,
}: {
  rows: Array<{ key: string; name: string; period: string; due_date: string; filed: number; total: number; overdue: number }>;
  href: string;
}) {
  return (
    <section className="tff-card" data-testid="deadline-progress">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEE]">
        <h3 className="tff-section-title">Next deadlines</h3>
        <span className="text-xs text-slate-500">Next 14 days</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500">No compliance tasks fall due in the next 14 days.</p>
      ) : (
        <ul>
          {rows.map((r) => {
            const d = new Date(`${r.due_date}T00:00:00Z`);
            const open = r.total - r.filed;
            return (
              <li key={r.key} className="flex items-center gap-3 px-5 py-3 border-b border-[#E8EAEE] last:border-0">
                <div className="w-11 shrink-0 rounded-[10px] border border-[#E8EAEE] bg-slate-50 py-1 text-center">
                  <div className="text-base font-semibold leading-tight text-slate-900 tabular-nums">{d.getUTCDate()}</div>
                  <div className="text-[10.5px] uppercase tracking-wider text-slate-500">{d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900">{r.name}{r.period ? ` · ${r.period}` : ''}</div>
                  <div className="text-xs text-slate-500 tabular-nums">{r.filed} of {r.total} done</div>
                </div>
                {open === 0 ? (
                  <span className="tff-pill tff-pill-good">Complete</span>
                ) : r.overdue > 0 ? (
                  <span className="tff-pill tff-pill-bad">{r.overdue} stuck</span>
                ) : (
                  <span className="tff-pill tff-pill-warn">{open} open</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="px-5 py-3 border-t border-[#E8EAEE]">
        <Link href={href} className="text-xs font-medium text-teal-700 hover:underline">Open compliance</Link>
      </div>
    </section>
  );
}

export type WorkloadRowView = { user_id: string; name: string; open: number; overdue: number; dueSoon: number; onTrack: number; aboveAverage: boolean };

const AVATAR_TONES = ['bg-indigo-100 text-indigo-800', 'bg-pink-100 text-pink-800', 'bg-amber-100 text-amber-800', 'bg-emerald-100 text-emerald-800'];
function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

/** Open tasks per person as a small table: open, overdue and due this week, with no bars. */
export function WorkloadBars({ rows, title = 'Team workload', tasksHref }: { rows: WorkloadRowView[]; title?: string; tasksHref: string }) {
  return (
    <section className="tff-card" data-testid="workload-bars">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAEE]">
        <h3 className="tff-section-title">{title}</h3>
        <span className="text-xs text-slate-500">Open · due this week · overdue</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500">No open tasks are assigned.</p>
      ) : (
        <ul>
          {rows.slice(0, 8).map((r, i) => (
            <li key={r.user_id} className="flex items-center gap-3 px-5 py-2.5 border-b border-[#E8EAEE] last:border-0 hover:bg-slate-50/70">
              <span className={cn('h-7 w-7 shrink-0 rounded-full text-[11px] font-semibold flex items-center justify-center', AVATAR_TONES[i % AVATAR_TONES.length])}>{initials(r.name)}</span>
              <Link href={`${tasksHref}?assigned=${r.user_id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 hover:text-teal-700">
                {r.name}
                {r.aboveAverage && <span className="ml-2 text-xs font-normal text-slate-500">above average</span>}
              </Link>
              <span className="w-8 text-right text-sm tabular-nums text-slate-900">{r.open}</span>
              <span className={cn('tff-pill w-10 justify-center', r.dueSoon > 0 ? 'tff-pill-warn' : 'tff-pill-mute')}>{r.dueSoon}</span>
              <span className={cn('tff-pill w-10 justify-center', r.overdue > 0 ? 'tff-pill-bad' : 'tff-pill-good')}>{r.overdue}</span>
            </li>
          ))}
        </ul>
      )}
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
        <span className="text-xs text-slate-500">Tasks by due date</span>
      </div>
      <div className="flex gap-2">
        {days.map((d, i) => (
          <Link
            key={d.date}
            href={dayHref(d.date)}
            className={cn('flex-1 rounded-lg bg-slate-50 px-1 py-2 text-center text-xs text-slate-500 hover:bg-slate-100', i === 0 && 'ring-1 ring-teal-600')}
          >
            <div className="text-lg font-medium text-slate-900 tabular-nums leading-tight">{d.count}</div>
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
        <span className="text-xs text-slate-500">Days since last update</span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing is waiting on a client.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {tasks.map((t) => {
            const d = daysSince(t.updated_at, todayIso);
            return (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-slate-900">{t.title}</span>
                  {t.client_name && <span className="block truncate text-xs text-slate-500">{t.client_name}</span>}
                </span>
                <span className={cn('text-xs tabular-nums whitespace-nowrap rounded-full px-2 py-0.5', d !== null && d >= 8 ? 'bg-red-50 text-red-700' : d !== null && d >= 4 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>
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
