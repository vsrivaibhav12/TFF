import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';
import Link from 'next/link';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CheckCircle2, Clock, AlertTriangle, CalendarDays, Briefcase, Timer, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import ExportButton from '@/components/sophistication/export-button';

const ComplianceBarChart = dynamic(() => import('./compliance-bar-chart'), { ssr: false });

export const revalidate = 60;

export default async function AdminCompliancePage() {
  await requireRole('admin');
  const sb = createClient();
  const todayIso = new Date().toISOString().slice(0, 10);
  const horizonIso = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

  // Fetch compliance events with linked tasks — includes both rule-driven and service-driven
  const { data: events } = await sb
    .from('compliance_calendar_events')
    .select(`
      id, rule_code, period_label, due_date, status, task_id,
      compliance_calendar_rules(display_name, service_kind),
      sub_services(id, name, code, services(name)),
      tasks(status, completed_date, due_date, is_stuck)
    `)
    .gte('due_date', todayIso)
    .lte('due_date', horizonIso)
    .limit(1000);

  // Aggregate metrics
  let total = 0;
  let tasksCreated = 0;
  let filed = 0;
  let pending = 0;
  let overdue = 0;
  let onTime = 0;
  let delayed = 0;

  const serviceMap: Record<string, { filed: number; pending: number; overdue: number }> = {};
  const periodMap: Record<string, {
    rule_code: string;
    rule_name: string;
    service_kind: string;
    period_label: string;
    due_date: string;
    total: number;
    filed: number;
    pending: number;
    overdue: number;
    delayed: number;
  }> = {};

  for (const e of events ?? []) {
    const taskStatus = (e as any).tasks?.status as string | null | undefined;
    const taskCompleted = (e as any).tasks?.completed_date as string | null | undefined;
    const taskDue = (e as any).tasks?.due_date as string | null | undefined;
    const taskStuck = !!(e as any).tasks?.is_stuck;
    const dueDate = (e as any).due_date as string;
    const isPastDue = dueDate < todayIso;
    const serviceKind = (e as any).compliance_calendar_rules?.service_kind
      ?? ((e as any).sub_services ? 'service_driven' : 'other');
    const ruleName = (e as any).compliance_calendar_rules?.display_name
      ?? (e as any).sub_services?.name
      ?? (e as any).rule_code;
    const key = `${(e as any).rule_code}::${(e as any).period_label}`;

    total += 1;

    if (!serviceMap[serviceKind]) serviceMap[serviceKind] = { filed: 0, pending: 0, overdue: 0 };
    if (!periodMap[key]) {
      periodMap[key] = {
        rule_code: (e as any).rule_code,
        rule_name: ruleName,
        service_kind: serviceKind,
        period_label: (e as any).period_label,
        due_date: dueDate,
        total: 0,
        filed: 0,
        pending: 0,
        overdue: 0,
        delayed: 0,
      };
    }

    const p = periodMap[key];
    p.total += 1;

    if (taskStatus === 'completed') {
      filed += 1;
      p.filed += 1;
      serviceMap[serviceKind].filed += 1;
      tasksCreated += 1;

      if (taskCompleted && taskDue && taskCompleted <= taskDue) {
        onTime += 1;
      } else if (taskCompleted && taskDue && taskCompleted > taskDue) {
        delayed += 1;
        p.delayed += 1;
      }
    } else if ((e as any).task_id) {
      tasksCreated += 1;
      if (taskStuck || isPastDue) {
        overdue += 1;
        p.overdue += 1;
        serviceMap[serviceKind].overdue += 1;
      } else {
        pending += 1;
        p.pending += 1;
        serviceMap[serviceKind].pending += 1;
      }
    } else if (isPastDue) {
      overdue += 1;
      p.overdue += 1;
      serviceMap[serviceKind].overdue += 1;
    } else {
      pending += 1;
      p.pending += 1;
      serviceMap[serviceKind].pending += 1;
    }
  }

  const periodRows = Object.values(periodMap).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const serviceKinds = Object.keys(serviceMap).sort();
  const chartCategories = serviceKinds.map((k) => k.toUpperCase());
  const chartSeries = [
    { name: 'Filed', data: serviceKinds.map((k) => serviceMap[k].filed), color: '#10B981' },
    { name: 'Pending', data: serviceKinds.map((k) => serviceMap[k].pending), color: '#F59E0B' },
    { name: 'Overdue', data: serviceKinds.map((k) => serviceMap[k].overdue), color: '#EF4444' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="tff-page-title">Compliance dashboard</h1>
          <p className="tff-page-subtitle">
            Filing health across your portfolio. Track what&apos;s on time, what&apos;s delayed, and what&apos;s overdue.
          </p>
        </div>
        <ExportButton data={periodRows} filename="compliance-dashboard" format="excel" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total events" value={total} icon={<CalendarDays className="h-5 w-5" />} color="text-zinc-700" bg="bg-zinc-100" border="border-zinc-200" />
        <MetricCard label="Tasks created" value={tasksCreated} icon={<Briefcase className="h-5 w-5" />} color="text-blue-600" bg="bg-blue-50" border="border-blue-100" />
        <MetricCard label="Filed" value={filed} icon={<CheckCircle2 className="h-5 w-5" />} color="text-teal-600" bg="bg-teal-50" border="border-teal-100" />
        <MetricCard label="Pending" value={pending} icon={<Clock className="h-5 w-5" />} color="text-amber-600" bg="bg-amber-50" border="border-amber-100" />
        <MetricCard label="Overdue" value={overdue} icon={<AlertTriangle className="h-5 w-5" />} color="text-red-600" bg="bg-red-50" border="border-red-100" highlight={overdue > 0} />
        <MetricCard label="On time" value={onTime} icon={<TrendingUp className="h-5 w-5" />} color="text-teal-600" bg="bg-teal-50" border="border-teal-100" />
        <MetricCard label="Delayed" value={delayed} icon={<Timer className="h-5 w-5" />} color="text-orange-600" bg="bg-orange-50" border="border-orange-100" highlight={delayed > 0} />
        <MetricCard label="On-time %" value={filed > 0 ? `${Math.round((onTime / filed) * 100)}%` : '—'} icon={<CheckCircle2 className="h-5 w-5" />} color="text-teal-600" bg="bg-teal-50" border="border-teal-100" />
      </div>

      {/* Service-wise chart */}
      {serviceKinds.length > 0 && (
        <div className="tff-card tff-card-pad">
          <h2 className="tff-section-title mb-4">Filing by service kind</h2>
          <ComplianceBarChart categories={chartCategories} series={chartSeries} height={280} />
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
                <TableHead>Rule</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Due</TableHead>
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
                  <TableCell colSpan={9} className="text-center text-sm text-zinc-500 py-10">
                    No compliance events in the upcoming 12 months.
                  </TableCell>
                </TableRow>
              ) : (
                periodRows.map((r) => (
                  <TableRow key={`${r.rule_code}::${r.period_label}`}>
                    <TableCell className="font-medium">{r.rule_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs uppercase">
                        {r.service_kind === 'service_driven' ? 'Custom' : r.service_kind}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.period_label}</TableCell>
                    <TableCell className="text-xs tabular-nums">{formatDateIST(r.due_date)}</TableCell>
                    <TableCell className="text-right font-semibold">{r.total}</TableCell>
                    <TableCell className="text-right text-teal-600">{r.filed}</TableCell>
                    <TableCell className="text-right text-amber-600">{r.pending}</TableCell>
                    <TableCell className="text-right text-red-600">{r.overdue}</TableCell>
                    <TableCell className="text-right text-orange-600">{r.delayed}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
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
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</div>
          <div className={`text-3xl font-bold tabular-nums mt-0.5 ${highlight ? 'text-red-600' : 'text-zinc-900'}`}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}
