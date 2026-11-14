import { Button } from '@/components/ui/button';
import { listComplianceTasks } from '@/lib/repositories/compliance-tasks';
import { monthKeyOf, periodBounds, shiftMonth, summariseByDueMonth } from '@/lib/services/compliance-progress';
import { requireRole } from '@/lib/auth/require-role';
import { formatDateIST, todayIST } from '@/lib/utils';
import Link from 'next/link';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CheckCircle2, Clock, AlertTriangle, CalendarDays, Timer, TrendingUp, CalendarClock } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import ExportButton from '@/components/sophistication/export-button';
import SimpleBarChart from '@/components/compliance/simple-bar-chart';

function formatMonthKey(key: string) {
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export default async function AdminCompliancePage() {
  await requireRole('admin');
  const todayIso = todayIST();
  const fromIso = shiftMonth(monthKeyOf(todayIso), -11) + '-01';
  const toIso = periodBounds('month', shiftMonth(monthKeyOf(todayIso), 3)).to;

  // Every task of a sub-service marked as a compliance item, however it was created.
  const tasks = await listComplianceTasks(fromIso, toIso);
  const periodRows = summariseByDueMonth(tasks, todayIso);

  const total = tasks.length;
  const filed = periodRows.reduce((n, r) => n + r.done, 0);
  const pending = periodRows.reduce((n, r) => n + r.pending, 0);
  const overdue = periodRows.reduce((n, r) => n + r.overdue, 0);
  const onTime = periodRows.reduce((n, r) => n + r.onTime, 0);
  const delayed = periodRows.reduce((n, r) => n + r.delayed, 0);

  // Chart: one group of bars per compliance sub-service.
  const byService = new Map<string, { name: string; filed: number; pending: number; overdue: number }>();
  for (const r of periodRows) {
    const s = byService.get(r.sub_service_id) ?? { name: r.name, filed: 0, pending: 0, overdue: 0 };
    s.filed += r.done; s.pending += r.pending; s.overdue += r.overdue;
    byService.set(r.sub_service_id, s);
  }
  const services = [...byService.values()].sort((a, b) => a.name.localeCompare(b.name));
  const chartCategories = services.map((s) => s.name);
  const chartSeries = [
    { name: 'Filed', data: services.map((s) => s.filed), color: '#10B981' },
    { name: 'Pending', data: services.map((s) => s.pending), color: '#F59E0B' },
    { name: 'Overdue', data: services.map((s) => s.overdue), color: '#EF4444' },
  ];
  const exportRows = periodRows.map((r) => ({
    filing: r.name, due_month: r.month, total: r.total, filed: r.done, pending: r.pending, overdue: r.overdue, delayed: r.delayed,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="tff-page-title">Compliance dashboard</h1>
          <p className="tff-page-subtitle">
            Every task of a compliance sub-service, grouped by the month it falls due. The last 12 months and the next 3.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/compliance/create-tasks">
            <Button size="sm" data-testid="create-deadline-tasks-link"><CalendarClock className="h-4 w-4 mr-1" /> Create tasks for a deadline</Button>
          </Link>
          <ExportButton data={exportRows} filename="compliance-dashboard" format="excel" />
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          variant="chart"
          title="No compliance tasks yet"
          body="Tasks appear here when their sub-service is marked as a compliance item. Mark GSTR-1, GSTR-3B, TDS and similar services in the Services screen."
          actionHref="/admin/services"
          actionLabel="Open services"
        />
      ) : (
      <>
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Tasks" value={total} icon={<CalendarDays className="h-5 w-5" />} color="text-zinc-700" bg="bg-zinc-100" border="border-zinc-200" />
        <MetricCard label="Filed" value={filed} icon={<CheckCircle2 className="h-5 w-5" />} color="text-teal-600" bg="bg-teal-50" border="border-teal-100" />
        <MetricCard label="Pending" value={pending} icon={<Clock className="h-5 w-5" />} color="text-amber-600" bg="bg-amber-50" border="border-amber-100" />
        <MetricCard label="Overdue" value={overdue} icon={<AlertTriangle className="h-5 w-5" />} color="text-red-600" bg="bg-red-50" border="border-red-100" highlight={overdue > 0} />
        <MetricCard label="On time" value={onTime} icon={<TrendingUp className="h-5 w-5" />} color="text-teal-600" bg="bg-teal-50" border="border-teal-100" />
        <MetricCard label="Delayed" value={delayed} icon={<Timer className="h-5 w-5" />} color="text-amber-600" bg="bg-amber-50" border="border-amber-100" highlight={delayed > 0} />
        <MetricCard label="On-time %" value={filed > 0 ? `${Math.round((onTime / filed) * 100)}%` : '—'} icon={<CheckCircle2 className="h-5 w-5" />} color="text-teal-600" bg="bg-teal-50" border="border-teal-100" />
      </div>

      {/* Service-wise chart */}
      {services.length > 0 && (
        <div className="tff-card tff-card-pad">
          <h2 className="tff-section-title mb-4">Filing by service</h2>
          <SimpleBarChart categories={chartCategories} series={chartSeries} height={280} />
        </div>
      )}

      {/* Period-wise table */}
      <div className="tff-card overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-100">
          <h2 className="tff-section-title">Period-wise breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                <TableHead>Filing</TableHead>
                <TableHead>Due month</TableHead>
                <TableHead>First due</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Filed</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead className="text-right">Delayed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-zinc-500 py-10">
                    No compliance tasks in this window.
                  </TableCell>
                </TableRow>
              ) : (
                periodRows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs">{formatMonthKey(r.month)}</TableCell>
                    <TableCell className="text-xs tabular-nums">{formatDateIST(r.first_due)}</TableCell>
                    <TableCell className="text-right font-semibold">{r.total}</TableCell>
                    <TableCell className="text-right text-teal-600">{r.done}</TableCell>
                    <TableCell className="text-right text-amber-600">{r.pending}</TableCell>
                    <TableCell className="text-right text-red-600">{r.overdue}</TableCell>
                    <TableCell className="text-right text-amber-600">{r.delayed}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color,
  bg,
  border,
  highlight,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  highlight?: boolean;
}) {
  return (
    <div className="tff-card tff-card-pad">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl ${bg} ${color} flex items-center justify-center border ${border}`}>
          {icon}
        </div>
        <div>
          <div className="text-xs font-medium text-zinc-600">{label}</div>
          <div className={`text-2xl font-semibold tabular-nums mt-0.5 ${highlight ? 'text-red-600' : 'text-zinc-900'}`}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}
