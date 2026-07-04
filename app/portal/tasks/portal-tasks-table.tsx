'use client';

import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DockLink } from '@/components/shell/dock-link';
import { Badge } from '@/components/ui/badge';
import { ProgressMicro } from '@/components/ui/progress-micro';
import { ExpandableCell } from '@/components/ui/expandable-cell';
import { formatDateIST, cn, displayTaskName } from '@/lib/utils';
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

const COL_WIDTHS: Record<string, string> = {
  sub_service: '260px',
  period: '90px',
  due_date: '100px',
  status: '120px',
  labels: '140px',
  progress: '100px',
  actions: '50px',
};

function getGridCols(columns: { key: string; visible: boolean }[]): string {
  const visibleWidths = columns
    .filter((c) => c.visible)
    .map((c) => `minmax(0, ${COL_WIDTHS[c.key] || 'auto'})`);
  return visibleWidths.join(' ');
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

function formatPeriod(t: PortalTask) {
  if (t.period_month && t.period_year) {
    return `${new Date(t.period_year, t.period_month - 1).toLocaleString('default', { month: 'short' })} ${t.period_year}`;
  }
  if (t.period_quarter && t.period_year) {
    return `Q${t.period_quarter} ${t.period_year}`;
  }
  if (t.period_year) {
    return String(t.period_year);
  }
  return '—';
}

export default function PortalTasksTable({ tasks }: { tasks: PortalTask[] }) {
  const [sortKey, setSortKey] = useState<string>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const { columns, setColumns, density, setDensity } = useTablePrefs(
    'portal-tasks',
    DEFAULT_COLUMNS,
    'comfortable'
  );
  const parentRef = useRef<HTMLDivElement>(null);

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
      if (sortKey === 'status') {
        va = getClientVisibleStatus(a);
        vb = getClientVisibleStatus(b);
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

  const rowHeight = density === 'compact' ? 52 : 68;
  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

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
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-teal-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-teal-600" />
    );
  }

  const colVisible = (key: string) => columns.find((c) => c.key === key)?.visible ?? true;
  const gridTemplateColumns = getGridCols(columns);

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

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sorted.map((t) => {
          const cs = getClientVisibleStatus(t);
          const overdue = t.due_date && t.due_date < todayIso && t.status !== 'completed';
          const dueSoon = t.due_date && t.due_date === todayIso && t.status !== 'completed';
          const urgencyBorder = overdue
            ? 'border-l-2 border-l-red-500'
            : dueSoon
            ? 'border-l-2 border-l-amber-500'
            : t.status === 'in_progress'
            ? 'border-l-2 border-l-teal-500'
            : '';
          return (
            <DockLink
              key={t.id}
              item={{ type: 'task', id: t.id }}
              href={`/portal/tasks/${t.id}`}
              className="block"
            >
              <div
                className={cn(
                  'bg-white border border-zinc-200 rounded-xl p-4 space-y-2',
                  urgencyBorder
                )}
              >
                <div className="flex items-center justify-between">
                  <Badge variant={CLIENT_VISIBLE_VARIANTS[cs] as any} className="text-[10px]">
                    {CLIENT_VISIBLE_LABELS[cs]}
                  </Badge>
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      overdue
                        ? 'text-red-600 font-medium'
                        : dueSoon
                        ? 'text-amber-600 font-medium'
                        : 'text-zinc-500'
                    )}
                  >
                    {formatDateIST(t.due_date)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-zinc-900">{displayTaskName(t)}</p>
                {t.clients?.business_name && (
                  <p className="text-xs text-zinc-500">{t.clients.business_name}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 tabular-nums">
                    {formatPeriod(t)}
                  </span>
                  {t.labels && t.labels.length > 0 && (
                    <span className="text-[10px] text-zinc-500">{t.labels.length} labels</span>
                  )}
                </div>
              </div>
            </DockLink>
          );
        })}
      </div>

      {/* Desktop virtual table */}
      <div
        ref={parentRef}
        className="hidden md:block tff-card overflow-auto border border-zinc-200 rounded-xl"
        style={{ height: '60vh' }}
      >
        <div className="min-w-[860px]">
          {/* Sticky header */}
          <div
            className="sticky top-0 z-10 grid items-center bg-zinc-50/80 backdrop-blur-sm border-b border-zinc-200 px-4 h-12"
            style={{ gridTemplateColumns }}
          >
            {colVisible('sub_service') && (
              <button
                className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1"
                onClick={() => toggleSort('sub_service')}
              >
                Sub Service <SortIcon col="sub_service" />
              </button>
            )}
            {colVisible('period') && (
              <button
                className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1"
                onClick={() => toggleSort('period')}
              >
                Period <SortIcon col="period" />
              </button>
            )}
            {colVisible('due_date') && (
              <button
                className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1"
                onClick={() => toggleSort('due_date')}
              >
                Due date <SortIcon col="due_date" />
              </button>
            )}
            {colVisible('status') && (
              <button
                className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1"
                onClick={() => toggleSort('status')}
              >
                Status <SortIcon col="status" />
              </button>
            )}
            {colVisible('labels') && (
              <span className="text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Labels
              </span>
            )}
            {colVisible('progress') && (
              <span className="text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Progress
              </span>
            )}
            {colVisible('actions') && <span className="sr-only">Actions</span>}
          </div>

          {/* Virtual body */}
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const t = sorted[virtualRow.index];
              const cs = getClientVisibleStatus(t);
              const overdue = t.due_date && t.due_date < todayIso && t.status !== 'completed';
              const dueSoon = t.due_date && t.due_date === todayIso && t.status !== 'completed';
              const urgencyBorder = overdue
                ? 'border-l-2 border-l-red-500'
                : dueSoon
                ? 'border-l-2 border-l-amber-500'
                : t.status === 'in_progress'
                ? 'border-l-2 border-l-teal-500'
                : '';
              return (
                <div
                  key={t.id}
                  data-testid={`portal-task-row-${t.id}`}
                  className={cn(
                    'grid absolute left-0 right-0 px-4 border-b border-zinc-100 transition-colors hover:bg-zinc-50/60',
                    urgencyBorder
                  )}
                  style={{
                    top: 0,
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns,
                  }}
                >
                  {colVisible('sub_service') && (
                    <div className="flex flex-col justify-center py-2 min-w-0">
                      <DockLink
                        item={{ type: 'task', id: t.id }}
                        href={`/portal/tasks/${t.id}`}
                        className="font-semibold text-zinc-900 hover:text-teal-700 transition-colors text-sm block"
                      >
                        <ExpandableCell className="max-w-[250px]" maxLines={1}>
                          {displayTaskName(t)}
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
                    </div>
                  )}
                  {colVisible('period') && (
                    <div className="flex items-center py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 tabular-nums">
                        {formatPeriod(t)}
                      </span>
                    </div>
                  )}
                  {colVisible('due_date') && (
                    <div className="flex items-center py-2">
                      <span
                        className={cn(
                          'text-xs tabular-nums',
                          overdue
                            ? 'text-red-600 font-medium'
                            : dueSoon
                            ? 'text-amber-600 font-medium'
                            : 'text-zinc-700'
                        )}
                      >
                        {formatDateIST(t.due_date)}
                      </span>
                    </div>
                  )}
                  {colVisible('status') && (
                    <div className="flex items-center py-2">
                      <Badge
                        variant={CLIENT_VISIBLE_VARIANTS[cs] as any}
                        className="text-[10px]"
                        data-testid={`portal-task-status-${t.id}`}
                      >
                        {CLIENT_VISIBLE_LABELS[cs]}
                      </Badge>
                    </div>
                  )}
                  {colVisible('labels') && (
                    <div className="flex flex-wrap justify-center content-center gap-1 py-2">
                      {t.labels && t.labels.length > 0 ? (
                        <>
                          {t.labels.slice(0, 3).map((l) => (
                            <span
                              key={l.code}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                              style={{
                                backgroundColor: l.color_hex ? l.color_hex + '20' : '#f4f4f5',
                                borderColor: l.color_hex || '#e4e4e7',
                                color: l.color_hex || '#52525b',
                              }}
                            >
                              {l.display_name}
                            </span>
                          ))}
                          {t.labels.length > 3 && (
                            <span className="text-[10px] text-zinc-400">
                              +{t.labels.length - 3}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-zinc-300">—</span>
                      )}
                    </div>
                  )}
                  {colVisible('progress') && (
                    <div className="flex items-center justify-center py-2">
                      <ProgressMicro
                        progress={t.progress_pct ?? 0}
                        completed={t.step_completed ?? 0}
                        total={t.step_total ?? 0}
                      />
                    </div>
                  )}
                  {colVisible('actions') && (
                    <div className="flex items-center justify-end py-2">
                      <ArrowRight className="h-4 w-4 text-zinc-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
