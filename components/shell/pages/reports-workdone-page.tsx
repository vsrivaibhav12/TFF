import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listWorkDoneDetailed } from '@/lib/repositories/work-done';
import { todayIST, formatDateIST } from '@/lib/utils';
import { resolveRange, formatRangeLabel, eachDay } from '@/lib/reports/date-range';
import { summariseWorkDone, formatMinutes } from '@/lib/services/workdone-report';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import EmptyState from '@/components/sophistication/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReportFilters } from '@/components/reports/report-filters';
import { ReportExport } from '@/components/reports/report-export';
import { BarList, DayColumns, Pager } from '@/components/reports/report-bits';
import { Clock, ListChecks, CalendarDays, Gauge, Users, Building2 } from 'lucide-react';

interface SearchParams {
  from?: string;
  to?: string;
  range?: string;
  member?: string;
  client?: string;
  q?: string;
  page?: string;
}

const PAGE_SIZE = 50;

export default async function WorkDoneReportsPage({ searchParams }: { searchParams: SearchParams }, _rolePrefix: string) {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'view_workdone_reports');

  const range = resolveRange(searchParams, todayIST());
  const all = await listWorkDoneDetailed({ from: range.from, to: range.to });

  // Filter options come from the people and clients that actually have time logged in this range.
  const memberOptions = [...new Map(all.map((r) => [r.user_id, r.user_name])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const clientOptions = [...new Map(all.filter((r) => r.client_id).map((r) => [r.client_id as string, r.client_name])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const q = searchParams.q?.trim().toLowerCase();
  const rows = all.filter((r) =>
    (!searchParams.member || r.user_id === searchParams.member) &&
    (!searchParams.client || r.client_id === searchParams.client) &&
    (!q || `${r.note ?? ''} ${r.task_title} ${r.client_name} ${r.user_name}`.toLowerCase().includes(q)),
  );

  const s = summariseWorkDone(rows);

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hrefFor = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v && k !== 'page') u.set(k, v);
    u.set('page', String(p));
    return `?${u.toString()}`;
  };

  const rangeLabel = formatRangeLabel(range.from, range.to);

  // Every day in the range up to today, including days with nothing logged, so gaps show as gaps.
  const perDay = new Map(s.by_day.map((d) => [d.date, d.minutes]));
  const lastDay = range.to < todayIST() ? range.to : todayIST();
  const dayColumns = eachDay(range.from, lastDay).map((date) => ({ date, value: perDay.get(date) ?? 0 }));

  const entryRows = rows.map((r) => ({
    Date: r.work_date,
    Member: r.user_name,
    Client: r.client_name,
    Task: r.task_title,
    Minutes: r.duration_minutes,
    Duration: formatMinutes(r.duration_minutes),
    Method: r.entry_method ?? '',
    Note: r.note ?? '',
  }));
  const toRows = (b: { name: string; minutes: number; entries: number }[], label: string) =>
    b.map((x) => ({ [label]: x.name, Minutes: x.minutes, Duration: formatMinutes(x.minutes), Entries: x.entries }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Work done report"
        subtitle={`Time logged by the team, ${rangeLabel}.`}
        actions={
          <ReportExport
            datasets={[
              { label: 'All entries', filename: `work-done-entries_${range.from}_${range.to}`, sheetName: 'Entries', rows: entryRows },
              { label: 'By member', filename: `work-done-by-member_${range.from}_${range.to}`, sheetName: 'By member', rows: toRows(s.by_member, 'Member') },
              { label: 'By client', filename: `work-done-by-client_${range.from}_${range.to}`, sheetName: 'By client', rows: toRows(s.by_client, 'Client') },
              { label: 'By task', filename: `work-done-by-task_${range.from}_${range.to}`, sheetName: 'By task', rows: toRows(s.by_task, 'Task') },
            ]}
          />
        }
      />

      <ReportFilters
        from={range.from}
        to={range.to}
        preset={range.preset}
        selects={[
          { key: 'member', label: 'Team member', allLabel: 'All members', options: memberOptions },
          { key: 'client', label: 'Client', allLabel: 'All clients', options: clientOptions },
        ]}
        search={{ key: 'q', placeholder: 'Note, task or client' }}
      />

      {range.clamped && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          That range was longer than 400 days, so it was shortened to end on {formatDateIST(range.to)}.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No time logged"
          body="Nothing matches these filters. Try a wider date range or clear the member and client filters."
          variant="chart"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="Total time" value={formatMinutes(s.total_minutes)} icon={<Clock className="h-4 w-4" />} tone="zinc" />
            <StatCard label="Entries" value={s.entries} icon={<ListChecks className="h-4 w-4" />} tone="zinc" />
            <StatCard label="Active days" value={s.active_days} icon={<CalendarDays className="h-4 w-4" />} tone="zinc" />
            <StatCard label="Average per active day" value={formatMinutes(s.avg_minutes_per_active_day)} icon={<Gauge className="h-4 w-4" />} tone="zinc" />
            <StatCard label="Team members" value={s.members} icon={<Users className="h-4 w-4" />} tone="zinc" />
            <StatCard label="Clients" value={s.clients} icon={<Building2 className="h-4 w-4" />} tone="zinc" />
          </div>

          <section className="tff-card overflow-hidden" aria-label="Time per day">
            <div className="px-5 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-900">Time per day</h2></div>
            <DayColumns days={dayColumns} format={formatMinutes} />
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section className="tff-card overflow-hidden" aria-label="By team member">
              <div className="px-5 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-900">By team member</h2></div>
              <BarList items={s.by_member.map((b) => ({ key: b.key, name: b.name, value: b.minutes, hint: `${b.entries} entries` }))} format={formatMinutes} />
            </section>
            <section className="tff-card overflow-hidden" aria-label="By client">
              <div className="px-5 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-900">By client</h2></div>
              <BarList items={s.by_client.slice(0, 15).map((b) => ({ key: b.key, name: b.name, value: b.minutes, hint: `${b.entries} entries` }))} format={formatMinutes} barClass="bg-sky-500" />
            </section>
            <section className="tff-card overflow-hidden" aria-label="Top tasks">
              <div className="px-5 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-900">Top tasks</h2></div>
              <BarList items={s.by_task.map((b) => ({ key: b.key, name: b.name, value: b.minutes, hint: `${b.entries} entries` }))} format={formatMinutes} barClass="bg-violet-500" emptyText="No time was logged against a task." />
            </section>
          </div>

          <section className="tff-card overflow-hidden" aria-label="All entries">
            <div className="px-5 py-3 border-b border-slate-100 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-slate-900">All entries</h2>
              <span className="text-xs text-slate-500 tabular-nums">{rows.length} in total</span>
            </div>
            <div className="overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead className="text-right w-24">Time</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => (
                    <TableRow key={r.id} className="hover:bg-slate-50/60">
                      <TableCell className="text-sm tabular-nums text-slate-700 whitespace-nowrap">{formatDateIST(r.work_date)}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-900">{r.user_name}</TableCell>
                      <TableCell className="text-sm text-slate-700">{r.client_name}</TableCell>
                      <TableCell className="text-sm text-slate-700 max-w-[16rem] truncate" title={r.task_title}>{r.task_title}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium text-slate-900">{formatMinutes(r.duration_minutes)}</TableCell>
                      <TableCell className="text-sm text-slate-500 max-w-[20rem] truncate" title={r.note ?? ''}>{r.note || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pager page={page} pages={pages} total={rows.length} pageSize={PAGE_SIZE} hrefFor={hrefFor} />
          </section>
        </>
      )}
    </div>
  );
}
