import Link from 'next/link';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listAttendanceRange } from '@/lib/repositories/attendance';
import { listTeamUsers } from '@/lib/repositories/clients';
import { todayIST, formatDateIST, formatTimeIST, cn } from '@/lib/utils';
import { resolveRange, formatRangeLabel } from '@/lib/reports/date-range';
import { summariseAttendance, hoursWorked, STATUS_LABELS } from '@/lib/services/attendance-report';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/sophistication/empty-state';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReportFilters, type FilterSelect } from '@/components/reports/report-filters';
import { ReportExport } from '@/components/reports/report-export';
import { Pager } from '@/components/reports/report-bits';
import { UserCheck, Home, Palmtree, UserX, CircleHelp, Percent } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface SearchParams {
  from?: string;
  to?: string;
  range?: string;
  member?: string;
  status?: string;
  view?: string;
  page?: string;
}

const PAGE_SIZE = 50;
const STATUS_VARIANT: Record<string, 'success' | 'teal' | 'warning' | 'danger'> = {
  present: 'success',
  work_from_home: 'teal',
  leave: 'warning',
  absent: 'danger',
};

const fmtHours = (h: number) => (h > 0 ? `${h.toFixed(1)} h` : '—');

/** Attendance report for admins and for team members who hold the "view all attendance" permission. */
export default async function AttendanceReportPage({ searchParams }: { searchParams: SearchParams }, rolePrefix: string) {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'attendance.view_all');

  const today = todayIST();
  const range = resolveRange(searchParams, today);
  const view = searchParams.view === 'log' ? 'log' : 'summary';

  const [team, logs] = await Promise.all([
    listTeamUsers(),
    listAttendanceRange({ from: range.from, to: range.to }),
  ]);

  const members = team.map((m: { id: string; full_name: string | null; email: string }) => ({ id: m.id, name: m.full_name || m.email }));
  const memberFilter = searchParams.member;
  const statusFilter = searchParams.status;

  const scopedMembers = memberFilter ? members.filter((m) => m.id === memberFilter) : members;
  const scopedLogs = memberFilter ? logs.filter((l) => l.user_id === memberFilter) : logs;
  const { members: summary, totals } = summariseAttendance(scopedMembers, scopedLogs, range, today);

  const logRows = (statusFilter ? scopedLogs.filter((l) => l.status === statusFilter) : scopedLogs);
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const pages = Math.max(1, Math.ceil(logRows.length / PAGE_SIZE));
  const pageRows = logRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hrefFor = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v && k !== 'page') u.set(k, v);
    u.set('page', String(p));
    return `?${u.toString()}`;
  };
  const viewHref = (v: 'summary' | 'log') => {
    const u = new URLSearchParams();
    for (const [k, val] of Object.entries(searchParams)) if (val && k !== 'page' && k !== 'view') u.set(k, val);
    u.set('view', v);
    return `?${u.toString()}`;
  };

  // Clicking a name in the summary opens that person's daily log, keeping the date range.
  const memberLogHref = (userId: string) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v && k !== 'page' && k !== 'view' && k !== 'member' && k !== 'status') u.set(k, v);
    u.set('member', userId);
    u.set('view', 'log');
    return `?${u.toString()}`;
  };

  const selects: FilterSelect[] = [
    { key: 'member', label: 'Team member', allLabel: 'All members', options: members.map((m) => ({ value: m.id, label: m.name })).sort((a, b) => a.label.localeCompare(b.label)) },
  ];
  if (view === 'log') {
    selects.push({
      key: 'status', label: 'Status', allLabel: 'All statuses',
      options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
    });
  }

  const exportSummary = summary.map((s) => ({
    Member: s.name,
    'Working days': s.working_days,
    Present: s.present,
    'Work from home': s.work_from_home,
    Leave: s.leave,
    Absent: s.absent,
    'Not marked': s.not_marked,
    'Attendance rate %': s.rate ?? '',
    'Average hours': s.avg_hours,
    'Total hours': s.total_hours,
  }));
  const exportLog = logRows.map((l) => {
    const h = hoursWorked(l.check_in_time, l.check_out_time);
    return {
      Date: l.attendance_date,
      Member: l.user_name,
      Status: STATUS_LABELS[l.status] ?? l.status,
      'Check in': l.check_in_time ? formatTimeIST(l.check_in_time) : '',
      'Check out': l.check_out_time ? formatTimeIST(l.check_out_time) : '',
      Hours: h !== null ? Math.round(h * 10) / 10 : '',
      'Leave type': l.leave_type ?? '',
      'Entered by admin': l.is_manually_created ? 'Yes' : '',
      Note: l.override_reason ?? '',
    };
  });

  const rangeLabel = formatRangeLabel(range.from, range.to);
  const tab = (v: 'summary' | 'log', label: string) => (
    <Link
      href={viewHref(v)}
      aria-current={view === v ? 'page' : undefined}
      className={cn(
        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        view === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900',
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance report"
        subtitle={`Who was in, away or unmarked, ${rangeLabel}.`}
        actions={
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${rolePrefix}/attendance`}>Daily attendance</Link>
            </Button>
            <ReportExport
              datasets={[
                { label: 'Summary by member', filename: `attendance-summary_${range.from}_${range.to}`, sheetName: 'Summary', rows: exportSummary },
                { label: 'Daily log', filename: `attendance-log_${range.from}_${range.to}`, sheetName: 'Daily log', rows: exportLog },
              ]}
            />
          </>
        }
      />

      <ReportFilters from={range.from} to={range.to} preset={range.preset} selects={selects} />

      {range.clamped && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          That range was longer than 400 days, so it was shortened to end on {formatDateIST(range.to)}.
        </p>
      )}

      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Attendance rate" value={totals.rate === null ? '—' : `${totals.rate}%`} icon={<Percent className="h-4 w-4" />} tone="zinc" />
        <StatCard label="Present days" value={totals.present} icon={<UserCheck className="h-4 w-4" />} tone="zinc" />
        <StatCard label="Work from home" value={totals.work_from_home} icon={<Home className="h-4 w-4" />} tone="zinc" />
        <StatCard label="Leave days" value={totals.leave} icon={<Palmtree className="h-4 w-4" />} tone="zinc" />
        <StatCard label="Absent days" value={totals.absent} icon={<UserX className="h-4 w-4" />} tone={totals.absent > 0 ? 'red' : 'zinc'} />
        <StatCard label="Not marked" value={totals.not_marked} icon={<CircleHelp className="h-4 w-4" />} tone={totals.not_marked > 0 ? 'amber' : 'zinc'} />
      </div>

      <div className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 p-1" role="navigation" aria-label="Report view">
        {tab('summary', 'Summary by member')}
        {tab('log', 'Daily log')}
      </div>

      {view === 'summary' ? (
        <section className="tff-card overflow-hidden" aria-label="Summary by member">
          {summary.length === 0 ? (
            <EmptyState title="No team members" body="There is nobody to report on." variant="clients" />
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">Present</TableHead>
                    <TableHead className="text-right">Work from home</TableHead>
                    <TableHead className="text-right">Leave</TableHead>
                    <TableHead className="text-right">Absent</TableHead>
                    <TableHead className="text-right">Not marked</TableHead>
                    <TableHead className="w-44">Attendance rate</TableHead>
                    <TableHead className="text-right">Average day</TableHead>
                    <TableHead className="text-right">Total hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((s) => (
                    <TableRow key={s.user_id} className="hover:bg-zinc-50/60">
                      <TableCell className="text-sm font-medium text-zinc-900">
                        <Link href={memberLogHref(s.user_id)} className="hover:text-teal-700" title="See this person's daily log">{s.name}</Link>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-zinc-700">{s.present}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-zinc-700">{s.work_from_home}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-zinc-700">{s.leave}</TableCell>
                      <TableCell className={cn('text-right text-sm tabular-nums', s.absent > 0 ? 'font-semibold text-red-600' : 'text-zinc-500')}>{s.absent}</TableCell>
                      <TableCell className={cn('text-right text-sm tabular-nums', s.not_marked > 0 ? 'font-semibold text-amber-600' : 'text-zinc-500')}>{s.not_marked}</TableCell>
                      <TableCell>
                        {s.rate === null ? (
                          <span className="text-sm text-zinc-500">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-zinc-100 overflow-hidden" role="img" aria-label={`${s.rate} percent`}>
                              <div className={cn('h-full rounded-full', s.rate >= 90 ? 'bg-emerald-500' : s.rate >= 70 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${s.rate}%` }} />
                            </div>
                            <span className="w-10 text-right text-sm tabular-nums text-zinc-700">{s.rate}%</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-zinc-700">{fmtHours(s.avg_hours)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-zinc-700">{fmtHours(s.total_hours)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-zinc-50/70 font-semibold">
                    <TableCell className="text-sm text-zinc-900">Everyone</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{totals.present}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{totals.work_from_home}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{totals.leave}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{totals.absent}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{totals.not_marked}</TableCell>
                    <TableCell className="text-sm tabular-nums">{totals.rate === null ? '—' : `${totals.rate}%`}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmtHours(totals.avg_hours)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmtHours(totals.total_hours)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
          <p className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
            Working days are Monday to Saturday, counted up to today. Attendance rate is present plus work from home, out of working days that were not leave. Not marked means a working day with no record.
          </p>
        </section>
      ) : (
        <section className="tff-card overflow-hidden" aria-label="Daily log">
          {logRows.length === 0 ? (
            <EmptyState title="No attendance records" body="Nothing matches these filters. Try a wider date range or clear the filters." variant="document" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="min-w-[820px]">
                  <TableHeader>
                    <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                      <TableHead className="w-32">Date</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check in</TableHead>
                      <TableHead>Check out</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((l) => {
                      const h = hoursWorked(l.check_in_time, l.check_out_time);
                      return (
                        <TableRow key={l.id} className="hover:bg-zinc-50/60">
                          <TableCell className="text-sm tabular-nums text-zinc-700 whitespace-nowrap">{formatDateIST(l.attendance_date)}</TableCell>
                          <TableCell className="text-sm font-medium text-zinc-900">{l.user_name}</TableCell>
                          <TableCell><Badge variant={STATUS_VARIANT[l.status] ?? 'default'}>{STATUS_LABELS[l.status] ?? l.status}</Badge></TableCell>
                          <TableCell className="text-sm tabular-nums text-zinc-700">{l.check_in_time ? formatTimeIST(l.check_in_time) : '—'}</TableCell>
                          <TableCell className="text-sm tabular-nums text-zinc-700">{l.check_out_time ? formatTimeIST(l.check_out_time) : '—'}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-zinc-700">{h !== null ? fmtHours(h) : '—'}</TableCell>
                          <TableCell className="text-sm text-zinc-500 max-w-[18rem] truncate" title={l.override_reason ?? ''}>
                            {l.is_manually_created && <span className="mr-1 text-xs font-medium text-zinc-600">Entered by admin.</span>}
                            {l.override_reason || (l.is_manually_created ? '' : '—')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Pager page={page} pages={pages} total={logRows.length} pageSize={PAGE_SIZE} hrefFor={hrefFor} />
            </>
          )}
        </section>
      )}
    </div>
  );
}
