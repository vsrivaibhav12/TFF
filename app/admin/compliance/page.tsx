import Link from 'next/link';
import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react';
import { requireRole } from '@/lib/auth/require-role';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import ExportButton from '@/components/sophistication/export-button';
import EmptyState from '@/components/sophistication/empty-state';
import { DockLink } from '@/components/shell/dock-link';
import { listLinkedComplianceClients, listOverviewTasks } from '@/lib/repositories/compliance-tasks';
import { isMonthKey, monthKeyOf, periodBounds, periodLabel, periodStep, shiftMonth, type ProgressView } from '@/lib/services/compliance-progress';
import { buildClientRows, buildFilings, STATUS_LABEL, totalsOf, type StatusKey } from '@/lib/services/compliance-overview';
import { cn, formatDateIST, todayIST } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Params = { w?: string; m?: string; f?: string; s?: string; all?: string };

const STATUS_PILL: Record<StatusKey, string> = {
  done: 'tff-pill-good',
  overdue: 'tff-pill-bad',
  waiting: 'tff-pill-warn',
  in_progress: 'tff-pill-accent',
  not_started: 'tff-pill-mute',
  missing: 'tff-pill-info',
};
const FILTERS: Array<{ key: string; label: string }> = [
  { key: '', label: 'Needs action' },
  { key: 'all', label: 'Everything' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'missing', label: 'No task yet' },
  { key: 'open', label: 'In progress' },
  { key: 'done', label: 'Done' },
];
const PAGE_LIMIT = 100;

function tier(pct: number) {
  return pct >= 90 ? 'tff-pill-good' : pct >= 75 ? 'tff-pill-warn' : 'tff-pill-bad';
}
function initials(name: string | null) {
  return (name ?? '').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '—';
}
function matches(status: StatusKey, filter: string) {
  if (filter === 'all') return true;
  if (filter === '') return status === 'overdue' || status === 'missing' || status === 'waiting';
  if (filter === 'open') return status === 'in_progress' || status === 'not_started' || status === 'waiting';
  return status === filter;
}

export default async function AdminCompliancePage({ searchParams }: { searchParams?: Params }) {
  await requireRole('admin');
  const todayIso = todayIST();
  const currentMonth = monthKeyOf(todayIso);
  const view: ProgressView = searchParams?.w === 'quarter' || searchParams?.w === 'year' ? searchParams.w : 'month';
  const monthKey = isMonthKey(searchParams?.m) ? searchParams!.m! : currentMonth;
  const bounds = periodBounds(view, monthKey);
  const step = periodStep(view);

  const [tasks, linked] = await Promise.all([listOverviewTasks(bounds.from, bounds.to), listLinkedComplianceClients()]);
  const filings = buildFilings(tasks, linked, view, todayIso);
  const totals = totalsOf(filings);

  const selected = filings.find((f) => f.id === searchParams?.f) ?? null;
  const filter = searchParams?.s ?? '';
  const allRows = buildClientRows(tasks, filings, todayIso, selected?.id ?? null);
  const filterCounts = Object.fromEntries(FILTERS.map((f) => [f.key, allRows.filter((r) => matches(r.status, f.key)).length]));
  const rows = allRows.filter((r) => matches(r.status, filter));
  const shown = searchParams?.all ? rows : rows.slice(0, PAGE_LIMIT);

  const href = (o: Partial<Params>) => {
    const next: Params = { w: view === 'month' ? undefined : view, m: monthKey === currentMonth ? undefined : monthKey, f: selected?.id, s: filter || undefined, ...o };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/admin/compliance?${s}` : '/admin/compliance';
  };
  const monthParam = (delta: number) => {
    const m = shiftMonth(monthKey, delta);
    return m === currentMonth ? undefined : m;
  };
  const navBtn = 'h-9 w-9 inline-flex items-center justify-center rounded-[10px] border border-[#DCDFE5] bg-white text-slate-600 hover:bg-slate-50';

  const exportRows = allRows.map((r) => ({
    filing: r.filing_name, client: r.client_name, status: STATUS_LABEL[r.status], due: r.due_date ?? '', owner: r.assignee_name ?? '', completed: r.completed_date?.slice(0, 10) ?? '',
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Compliance"
        subtitle="Where every filing stands, and which clients still need work. Counts come from tasks, however they were created."
        showBreadcrumbs={false}
        actions={
          <>
            <ExportButton data={exportRows} filename="compliance" format="excel" />
            <Link href="/admin/compliance/create-tasks">
              <Button size="sm" data-testid="create-deadline-tasks-link"><CalendarClock className="h-4 w-4" /> Create tasks for a deadline</Button>
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-[10px] border border-[#E8EAEE] bg-white p-0.5 text-[13px] shadow-card">
            {(['month', 'quarter', 'year'] as const).map((v) => (
              <Link key={v} href={href({ w: v === 'month' ? undefined : v, f: undefined, s: undefined })} aria-current={view === v ? 'true' : undefined}
                className={cn('rounded-lg px-3 py-1.5', view === v ? 'bg-[#E6F6F3] font-medium text-[#0B6B62]' : 'text-slate-600 hover:text-slate-900')}>
                {v === 'month' ? 'Month' : v === 'quarter' ? 'Quarter' : 'Financial year'}
              </Link>
            ))}
          </div>
          <Link href={href({ m: monthParam(-step), f: undefined, s: undefined })} aria-label="Previous period" className={navBtn}><ChevronLeft className="h-4 w-4" /></Link>
          <span className="min-w-[9rem] text-center text-sm font-semibold text-slate-900">{periodLabel(view, monthKey)}</span>
          <Link href={href({ m: monthParam(step), f: undefined, s: undefined })} aria-label="Next period" className={navBtn}><ChevronRight className="h-4 w-4" /></Link>
          {monthKey !== currentMonth && <Link href={href({ m: undefined, f: undefined, s: undefined })} className="text-sm font-medium text-teal-700 hover:underline">Today</Link>}
        </div>
        <span className="text-xs text-slate-500">Filings due {formatDateIST(bounds.from)} to {formatDateIST(bounds.to)}</span>
      </div>

      {filings.length === 0 ? (
        <EmptyState
          variant="chart"
          title="No compliance work in this period"
          body="Tasks appear here when their sub-service is marked as a compliance item. Mark GSTR-1, GSTR-3B, TDS and similar services in the Services screen, or pick another period."
          actionHref="/admin/services"
          actionLabel="Open services"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Completed" value={`${totals.pct}%`} hint={`${totals.done.toLocaleString('en-IN')} of ${totals.expected.toLocaleString('en-IN')} filings`} icon={<span className="text-[11px] font-semibold">%</span>} />
            <StatCard label="In progress" value={totals.inProgress} hint="Started or waiting on a client" icon={<span className="text-[11px] font-semibold">…</span>} />
            <StatCard label="Overdue" value={totals.overdue} hint="Past the due date or stuck" icon={<span className="text-[11px] font-semibold">!</span>} tone="red" />
            <StatCard label="No task yet" value={totals.missing} hint="Linked clients without a task" icon={<span className="text-[11px] font-semibold">+</span>} tone="amber" />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="tff-section-title">Filings</h2>
              {selected && <Link href={href({ f: undefined, s: undefined })} className="text-sm font-medium text-teal-700 hover:underline">Show all filings</Link>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filings.map((f) => (
                <Link
                  key={f.id}
                  href={href({ f: selected?.id === f.id ? undefined : f.id, s: undefined })}
                  aria-current={selected?.id === f.id ? 'true' : undefined}
                  className={cn('tff-card p-4 block transition-all hover:-translate-y-0.5', selected?.id === f.id && 'border-teal-600 ring-1 ring-teal-600')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{f.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500 tabular-nums">{f.done.toLocaleString('en-IN')} of {f.expected.toLocaleString('en-IN')} done</div>
                    </div>
                    <span className={cn('tff-pill min-w-[3.5rem] justify-center text-sm', tier(f.pct))}>{f.pct}%</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {f.overdue > 0 && <span className="tff-pill tff-pill-bad">{f.overdue} overdue</span>}
                    {(f.missing ?? 0) > 0 && <span className="tff-pill tff-pill-info">{f.missing} no task yet</span>}
                    {f.waiting > 0 && <span className="tff-pill tff-pill-warn">{f.waiting} waiting</span>}
                    {f.inProgress + f.notStarted > 0 && <span className="tff-pill tff-pill-mute">{f.inProgress + f.notStarted} open</span>}
                    {f.overdue + (f.missing ?? 0) + f.waiting + f.inProgress + f.notStarted === 0 && <span className="tff-pill tff-pill-good">All done</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="tff-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8EAEE] px-5 py-4">
              <div>
                <h3 className="tff-section-title">{selected ? selected.name : 'All filings'}</h3>
                <p className="text-xs text-slate-500">
                  {selected && selected.missing === null
                    ? 'Clients without a task are listed only when the period matches how often this filing is due. Pick its own period to see them.'
                    : 'Clients that need action come first.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
                {FILTERS.map((f) => (
                  <Link
                    key={f.key}
                    href={href({ s: f.key || undefined })}
                    aria-current={filter === f.key ? 'true' : undefined}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px]',
                      filter === f.key ? 'border-transparent bg-[#E6F6F3] font-medium text-[#0B6B62]' : 'border-[#E8EAEE] bg-white text-slate-600 hover:border-[#DCDFE5]',
                    )}
                  >
                    {f.label}
                    <span className="text-xs tabular-nums text-slate-500">{filterCounts[f.key]}</span>
                  </Link>
                ))}
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                {filter === '' ? 'Nothing needs action here. Choose Everything to see every client.' : 'No clients match this filter.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-[#E8EAEE] bg-slate-50/70 text-left text-xs text-slate-500">
                      <th className="px-5 py-2.5 font-medium">Client</th>
                      {!selected && <th className="px-3 py-2.5 font-medium">Filing</th>}
                      <th className="px-3 py-2.5 font-medium">Due</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Owner</th>
                      <th className="px-5 py-2.5 text-right font-medium">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.key} className="border-b border-[#E8EAEE] last:border-0 hover:bg-slate-50/70">
                        <td className="px-5 py-2.5">
                          {r.task_id ? (
                            <DockLink item={{ type: 'task', id: r.task_id }} href={`/admin/tasks/${r.task_id}`} className="font-medium text-slate-900 hover:text-teal-700">{r.client_name}</DockLink>
                          ) : (
                            <span className="font-medium text-slate-900">{r.client_name}</span>
                          )}
                        </td>
                        {!selected && <td className="px-3 py-2.5 text-slate-600">{r.filing_name}</td>}
                        <td className="px-3 py-2.5 tabular-nums text-slate-600">{r.due_date ? formatDateIST(r.due_date) : '—'}</td>
                        <td className="px-3 py-2.5"><span className={cn('tff-pill tff-pill-dot', STATUS_PILL[r.status])}>{STATUS_LABEL[r.status]}</span></td>
                        <td className="px-3 py-2.5">
                          {r.assignee_name ? (
                            <span className="inline-flex items-center gap-2 text-slate-700">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-800">{initials(r.assignee_name)}</span>
                              {r.assignee_name}
                            </span>
                          ) : (
                            <span className="text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums text-slate-500">{r.completed_date ? formatDateIST(r.completed_date.slice(0, 10)) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E8EAEE] px-5 py-3 text-xs text-slate-500">
              <span>Showing {shown.length.toLocaleString('en-IN')} of {rows.length.toLocaleString('en-IN')}</span>
              <span className="flex items-center gap-3">
                {rows.length > shown.length && <Link href={href({ all: '1' })} className="font-medium text-teal-700 hover:underline">Show all</Link>}
                {allRows.some((r) => r.status === 'missing') && (
                  <Link href="/admin/compliance/create-tasks" className="font-medium text-teal-700 hover:underline">Create the missing tasks</Link>
                )}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
