'use client';

import { useState, useMemo } from 'react';
import { DockLink } from '@/components/shell/dock-link';
import { Badge } from '@/components/ui/badge';
import { ProgressMicro } from '@/components/ui/progress-micro';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExpandableCell } from '@/components/ui/expandable-cell';
import { formatDateIST, cn } from '@/lib/utils';
import {
  getClientVisibleStatus,
  CLIENT_VISIBLE_LABELS,
  CLIENT_VISIBLE_VARIANTS,
} from '@/lib/services/client-visible-status';
import { ArrowUpDown, ArrowUp, ArrowDown, ArrowRight, Building2 } from 'lucide-react';
import { TableToolbar, useTablePrefs } from '@/components/ui/table-enhancements';

interface PortalTask {
  id: string;
  title: string;
  due_date?: string;
  status: string;
  period_year?: number | null;
  period_month?: number | null;
  period_quarter?: number | null;
  clients?: { business_name: string } | null;
  sub_services?: { id: string; code: string; name: string } | null;
  labels?: { code: string; display_name: string; color_hex: string | null }[];
  progress_pct?: number;
  step_total?: number;
  step_completed?: number;
}

const DEFAULT_COLUMNS = [
  { key: 'sub_service', label: 'Sub Service', visible: true, optional: false },
  { key: 'period', label: 'Period', visible: true, optional: false },
  { key: 'due_date', label: 'Due date', visible: true, optional: false },
  { key: 'status', label: 'Status', visible: true, optional: false },
  { key: 'labels', label: 'Labels', visible: true, optional: true },
  { key: 'progress', label: 'Progress', visible: true, optional: true },
  { key: 'actions', label: 'Actions', visible: true, optional: false },
];

export default function PortalTasksTable({ tasks }: { tasks: PortalTask[] }) {
  const [sortKey, setSortKey] = useState<string>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const { columns, setColumns, density, setDensity } = useTablePrefs('portal-tasks', DEFAULT_COLUMNS, 'comfortable');

  const todayIso = new Date().toISOString().split('T')[0];

  const sorted = useMemo(() => {
    const data = [...tasks];
    data.sort((a, b) => {
      let va: any = a[sortKey as keyof PortalTask];
      let vb: any = b[sortKey as keyof PortalTask];
      if (sortKey === 'sub_service') {
        va = a.sub_services?.name ?? '';
        vb = b.sub_services?.name ?? '';
      }
      if (sortKey === 'period') {
        va = a.period_year ?? 0;
        vb = b.period_year ?? 0;
        if (va === vb) {
          va = a.period_month ?? a.period_quarter ?? 0;
          vb = b.period_month ?? b.period_quarter ?? 0;
        }
      }
      if (va === null || va === undefined) va = '';
      if (vb === null || vb === undefined) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [tasks, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-zinc-300" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-teal-600" /> : <ArrowDown className="h-3 w-3 text-teal-600" />;
  }

  const colVisible = (key: string) => columns.find((c) => c.key === key)?.visible ?? true;
  const rowPadding = density === 'compact' ? 'py-2' : 'py-4';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <TableToolbar
          columns={columns}
          onColumnsChange={setColumns}
          density={density}
          onDensityChange={setDensity}
        />
      </div>
      <div className="tff-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                {colVisible('sub_service') && (
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('sub_service')}>
                    <span className="flex items-center gap-1">Sub Service <SortIcon col="sub_service" /></span>
                  </TableHead>
                )}
                {colVisible('period') && (
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('period')}>
                    <span className="flex items-center gap-1">Period <SortIcon col="period" /></span>
                  </TableHead>
                )}
                {colVisible('due_date') && (
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('due_date')}>
                    <span className="flex items-center gap-1">Due date <SortIcon col="due_date" /></span>
                  </TableHead>
                )}
                {colVisible('status') && (
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
                  </TableHead>
                )}
                {colVisible('labels') && (
                  <TableHead className="text-center">Labels</TableHead>
                )}
                {colVisible('progress') && (
                  <TableHead className="text-center">Progress</TableHead>
                )}
                {colVisible('actions') && (
                  <TableHead className="w-10"></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((t) => {
                const cs = getClientVisibleStatus(t);
                const overdue = t.due_date && t.due_date < todayIso && t.status !== 'completed';
                const dueSoon = t.due_date && t.due_date === todayIso && t.status !== 'completed';
                const urgencyBorder = overdue ? 'border-l-2 border-l-red-500' : dueSoon ? 'border-l-2 border-l-amber-500' : t.status === 'in_progress' ? 'border-l-2 border-l-teal-500' : '';
                return (
                  <TableRow key={t.id} className={cn('transition-colors hover:bg-zinc-50/60', urgencyBorder)} data-testid={`portal-task-row-${t.id}`} data-row>
                    {colVisible('sub_service') && (
                      <TableCell className={rowPadding}>
                        <DockLink
                          item={{ type: 'task', id: t.id }}
                          href={`/portal/tasks/${t.id}`}
                          className="font-semibold text-zinc-900 hover:text-teal-700 transition-colors text-sm block"
                        >
                          <ExpandableCell className="max-w-[250px]" maxLines={1}>
                            {t.sub_services?.name ?? t.title}
                          </ExpandableCell>
                        </DockLink>
                        {t.clients?.business_name && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-500">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <ExpandableCell className="max-w-[200px]" maxLines={1}>
                              {t.clients.business_name}
                            </ExpandableCell>
                          </div>
                        )}
                      </TableCell>
                    )}
                    {colVisible('period') && (
                      <TableCell className={rowPadding}>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 tabular-nums">
                          {t.period_month && t.period_year
                            ? `${new Date(t.period_year, t.period_month - 1).toLocaleString('default', { month: 'short' })} ${t.period_year}`
                            : t.period_quarter && t.period_year
                            ? `Q${t.period_quarter} ${t.period_year}`
                            : t.period_year
                            ? String(t.period_year)
                            : '—'}
                        </span>
                      </TableCell>
                    )}
                    {colVisible('due_date') && (
                      <TableCell className={rowPadding}>
                        <span className={cn('text-xs tabular-nums', overdue ? 'text-red-600 font-medium' : dueSoon ? 'text-amber-600 font-medium' : 'text-zinc-700')}>
                          {formatDateIST(t.due_date)}
                        </span>
                      </TableCell>
                    )}
                    {colVisible('status') && (
                      <TableCell className={rowPadding}>
                        <Badge
                          variant={CLIENT_VISIBLE_VARIANTS[cs] as any}
                          className="text-[10px]"
                          data-testid={`portal-task-status-${t.id}`}
                        >
                          {CLIENT_VISIBLE_LABELS[cs]}
                        </Badge>
                      </TableCell>
                    )}
                    {colVisible('labels') && (
                      <TableCell className={cn('text-center', rowPadding)}>
                        <div className="flex flex-wrap justify-center gap-1">
                          {t.labels && t.labels.length > 0 ? (
                            <>
                              {t.labels.slice(0, 3).map((l) => (
                                <span key={l.code} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border" style={{ backgroundColor: l.color_hex ? l.color_hex + '20' : '#f4f4f5', borderColor: l.color_hex || '#e4e4e7', color: l.color_hex || '#52525b' }}>
                                  {l.display_name}
                                </span>
                              ))}
                              {t.labels.length > 3 && (
                                <span className="text-[10px] text-zinc-400">+{t.labels.length - 3}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-zinc-300">—</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {colVisible('progress') && (
                      <TableCell className={cn('text-center', rowPadding)}>
                        <ProgressMicro progress={t.progress_pct ?? 0} completed={t.step_completed ?? 0} total={t.step_total ?? 0} />
                      </TableCell>
                    )}
                    {colVisible('actions') && (
                      <TableCell className={rowPadding}>
                        <ArrowRight className="h-4 w-4 text-zinc-300" />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
