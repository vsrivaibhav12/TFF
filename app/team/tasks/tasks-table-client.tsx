'use client';

import { formatPeriodColumns } from '@/lib/periods';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVirtualizer } from '@tanstack/react-virtual';

import { EditableCell } from '@/components/tasks/editable-cell';
import { Badge } from '@/components/ui/badge';
import { getStatusColour } from '@/lib/semantic-colours';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskCellContent, type CellContext } from '@/components/tasks/task-cells';
import { formatDateIST, cn, displayTaskName } from '@/lib/utils';
import BulkActionsBar from '@/components/sophistication/bulk-actions-bar';
import { transitionTaskAction, updateTaskAction, bulkDeleteTasksAction } from '@/lib/actions/tasks';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { User, Check, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TableToolbar, useTablePrefs } from '@/components/ui/table-enhancements';

interface TaskRow {
  id: string;
  task_number: string | null;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  period_year?: number | null;
  period_month?: number | null;
  period_quarter?: number | null;
  period_key?: string | null;
  is_verified?: boolean;
  is_stuck?: boolean;
  clients?: { business_name: string } | null;
  users_profile?: { id: string; full_name: string; email: string } | null;
  sub_services?: { id: string; code: string; name: string } | null;
  labels?: { code: string; display_name: string; color_hex: string | null }[];
  progress_pct?: number;
  minutes_logged?: number;
  step_total?: number;
  step_completed?: number;
}

const COL_WIDTHS: Record<string, string> = {
  select: '40px',
  task_number: '90px',
  sub_service: '2fr',
  client: '1.4fr',
  period: '100px',
  progress: '84px',
  due_date: '110px',
  status: '140px',
  time_spent: '84px',
  owner: '130px',
  labels: '140px',
  priority: '100px',
  verified: '90px',
};

const HEAD: Record<string, { label: string; sort?: string }> = {
  task_number: { label: 'No', sort: 'task_number' },
  sub_service: { label: 'Task', sort: 'sub_service' },
  client: { label: 'Client', sort: 'client' },
  period: { label: 'Period', sort: 'period' },
  progress: { label: 'Steps' },
  due_date: { label: 'Due', sort: 'due_date' },
  status: { label: 'Status' },
  time_spent: { label: 'Time' },
  owner: { label: 'Owner', sort: 'owner' },
  labels: { label: 'Labels' },
  priority: { label: 'Priority' },
  verified: { label: '' },
};

function getGridCols(columns: { key: string; visible: boolean }[]): string {
  const visibleWidths = columns.filter((c) => c.visible).map((c) => `minmax(0, ${COL_WIDTHS[c.key] || 'auto'})`);
  return visibleWidths.join(' ');
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'in_progress', label: 'In progress', color: 'teal' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'outline' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'outline' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'high', label: 'High', color: 'destructive' },
  { value: 'urgent', label: 'Urgent', color: 'destructive' },
];

import { TASK_TABLE_ID } from '@/lib/tasks/table-layout';

const DEFAULT_COLUMNS = [
  { key: 'select', label: 'Select', visible: true, optional: false },
  { key: 'task_number', label: 'Number', visible: false, optional: true },
  { key: 'sub_service', label: 'Task', visible: true, optional: false },
  { key: 'client', label: 'Client', visible: true, optional: false },
  { key: 'period', label: 'Period', visible: true, optional: false },
  { key: 'progress', label: 'Steps', visible: true, optional: true },
  { key: 'due_date', label: 'Due', visible: true, optional: false },
  { key: 'status', label: 'Status', visible: true, optional: false },
  { key: 'time_spent', label: 'Time', visible: true, optional: true },
  { key: 'owner', label: 'Owner', visible: true, optional: true },
  { key: 'labels', label: 'Labels', visible: false, optional: true },
  { key: 'priority', label: 'Priority', visible: false, optional: true },
  { key: 'verified', label: 'Verified', visible: false, optional: true },
];

export default function TasksTableClient({ tasks, todayIso, canEdit = false, canComplete = false, canDelete = false, isAdmin = false }: { tasks: TaskRow[]; todayIso?: string; canEdit?: boolean; canComplete?: boolean; canDelete?: boolean; isAdmin?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const { columns, setColumns, density, setDensity, resetLayout } = useTablePrefs(TASK_TABLE_ID, DEFAULT_COLUMNS, 'compact');

  const parentRef = useRef<HTMLDivElement>(null);


  const filtered = useMemo(() => {
    let data = [...tasks];
    data.sort((a, b) => {
      let va: any = a[sortKey as keyof TaskRow];
      let vb: any = b[sortKey as keyof TaskRow];
      if (sortKey === 'client') {
        va = a.clients?.business_name ?? '';
        vb = b.clients?.business_name ?? '';
      }
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
      if (sortKey === 'owner') {
        va = a.users_profile?.full_name ?? '';
        vb = b.users_profile?.full_name ?? '';
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

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => density === 'compact' ? 36 : 48,
    overscan: 8,
  });

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  function toggle(id: string) {
    const ns = new Set(selected);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setSelected(ns);
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.id)));
  }

  async function bulkChangeStatus(ids: string[], status?: string) {
    let success = 0;
    let failed = 0;
    await Promise.all(
      ids.map(async (id) => {
        const r = await transitionTaskAction({ task_id: id, to_status: status as any });
        if (r.success) success++;
        else failed++;
      })
    );
    if (failed > 0) toast.warning(`${success} updated, ${failed} failed`);
    else toast.success(`${success} tasks updated`);
    setSelected(new Set());
    return { success, failed };
  }

  async function bulkDelete(ids: string[]) {
    const r = await bulkDeleteTasksAction(ids);
    if (r.success) {
      toast.success(`Deleted ${ids.length} tasks`);
      setSelected(new Set());
      return { success: ids.length, failed: 0 };
    }
    toast.error(r.error ?? 'Failed to delete tasks');
    return { success: 0, failed: ids.length };
  }

  async function handleComplete(taskId: string) {
    const r = await transitionTaskAction({ task_id: taskId, to_status: 'completed' });
    if (r.success) {
      router.refresh();
      toast.success('Task marked complete');
    } else {
      toast.error(r.error ?? 'Failed to complete task');
    }
  }

  const handleUpdatePriority = useCallback(
    async (taskId: string, newPriority: string) => {
      const r = await updateTaskAction({ task_id: taskId, priority: newPriority as any });
      if (r.success) {
        router.refresh();
        return true;
      }
      toast.error(r.error ?? 'Failed to update priority');
      return false;
    },
    [router]
  );

  const handleUpdateStatus = useCallback(
    async (taskId: string, newStatus: string) => {
      const r = await transitionTaskAction({ task_id: taskId, to_status: newStatus as any });
      if (r.success) {
        router.refresh();
        return true;
      }
      toast.error(r.error ?? 'Failed to update status');
      return false;
    },
    [router]
  );

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-slate-300" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-teal-600" /> : <ArrowDown className="h-3 w-3 text-teal-600" />;
  }

  const colVisible = (key: string) => columns.find((c) => c.key === key)?.visible ?? true;
  const gridTemplateColumns = getGridCols(columns);
  const visibleCols = columns.filter((c) => c.visible);
  const cellCtx: CellContext = {
    todayIso: todayIso ?? '',
    base: '/team',
    canEdit,
    isAdmin,
    statusSlot: canComplete
      ? (t) => <EditableCell value={t.status} options={STATUS_OPTIONS} onSave={(val) => handleUpdateStatus(t.id, val)} />
      : undefined,
    prioritySlot: canEdit
      ? (t) => <EditableCell value={t.priority ?? ''} options={PRIORITY_OPTIONS} onSave={(val) => handleUpdatePriority(t.id, val)} />
      : undefined,
  };
  const rowHeight = density === 'compact' ? 36 : 48;

  return (
    <>
      {/* Mobile cards with swipe */}
      <div className="space-y-3 md:hidden">
        {tasks.map((t) => {
          const overdue = t.due_date && todayIso && t.due_date < todayIso && t.status !== 'completed' && t.status !== 'cancelled';
          const dueSoon = t.due_date && todayIso && t.due_date === todayIso && t.status !== 'completed' && t.status !== 'cancelled';
          const urgencyBorder = overdue ? 'border-l-2 border-l-red-500' : dueSoon ? 'border-l-2 border-l-amber-500' : t.status === 'in_progress' ? 'border-l-2 border-l-teal-500' : '';
          return (
            <SwipeableRow
              key={t.id}
              rightActions={[
                {
                  label: 'Complete',
                  icon: <Check className="h-4 w-4" />,
                  color: '#16A34A',
                  onClick: () => handleComplete(t.id),
                },
              ]}
            >
              <div className={cn('tff-card p-4 space-y-2', urgencyBorder)}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">{t.task_number ?? '—'}</span>
                  <Badge className={cn('text-xs whitespace-nowrap', getStatusColour(t.status).bg, getStatusColour(t.status).text, getStatusColour(t.status).border)}>
                    {t.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{displayTaskName(t)}</p>
                  <p className="text-xs text-slate-500">{t.clients?.business_name ?? '—'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
                    {formatPeriodColumns(t) || '—'}
                  </span>
                  <span className={cn('text-xs tabular-nums', overdue ? 'text-red-600 font-medium' : dueSoon ? 'text-amber-600 font-medium' : 'text-slate-500')}>
                    {formatDateIST(t.due_date)}
                  </span>
                </div>
                {t.users_profile?.full_name && (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <User className="h-3 w-3" /> {t.users_profile.full_name}
                  </div>
                )}
              </div>
            </SwipeableRow>
          );
        })}
      </div>

      {/* Desktop virtual table */}
      <div className="hidden md:block space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 ml-auto">
            <TableToolbar
              columns={columns}
              onColumnsChange={setColumns}
              density={density}
              onDensityChange={setDensity}
              onReset={resetLayout}
            />
            <div className="text-sm text-slate-500">
              {tasks.length} tasks
            </div>
          </div>
        </div>

        <div ref={parentRef} className="tff-card overflow-auto" style={{ height: 'calc(100vh - 340px)', minHeight: 360 }}>
          {/* Sticky header */}
          <div className="sticky top-0 z-10 grid h-10 items-center border-b border-[#E8EAEE] bg-slate-50/90 px-4 backdrop-blur-sm" style={{ gridTemplateColumns }}>
            {visibleCols.map((c) => {
              if (c.key === 'select') {
                return (
                  <div key={c.key}>
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" data-testid="task-select-all" />
                  </div>
                );
              }
              const h = HEAD[c.key] ?? { label: c.label };
              const cls = 'flex items-center gap-1 text-left text-xs font-medium text-slate-500';
              return h.sort ? (
                <button key={c.key} className={cls} onClick={() => toggleSort(h.sort!)}>
                  {h.label} <SortIcon col={h.sort} />
                </button>
              ) : (
                <span key={c.key} className={h.label ? cls : 'sr-only'}>{h.label || 'Verified'}</span>
              );
            })}
          </div>

          {/* Virtual body */}
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const t = filtered[virtualRow.index];
              return (
                <div
                  key={t.id}
                  className={cn(
                    'group/row absolute left-0 grid w-full items-center border-b border-[#E8EAEE] px-4 transition-colors hover:bg-slate-50/70',
                    selected.has(t.id) && 'bg-[#E6F6F3]/60',
                  )}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns,
                  }}
                  data-testid={`task-row-${t.id}`}
                >
                  {visibleCols.map((c) => {
                    if (c.key === 'select') {
                      return (
                        <div key={c.key} className="min-w-0 overflow-hidden">
                          <Checkbox
                            checked={selected.has(t.id)}
                            onCheckedChange={() => toggle(t.id)}
                            aria-label={`Select task ${displayTaskName(t)}`}
                            data-testid={`task-select-${t.id}`}
                          />
                        </div>
                      );
                    }
                    return (
                      <div key={c.key} className="min-w-0 overflow-hidden pr-2">
                        <TaskCellContent col={c.key} t={t as never} ctx={cellCtx} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <BulkActionsBar
          ids={[...selected]}
          onClear={() => setSelected(new Set())}
          actions={[
            {
              type: 'select',
              label: 'Set status',
              options: [
                { value: 'in_progress', label: 'In progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ],
              onApply: bulkChangeStatus,
            },
            ...(canDelete
              ? [{
                  type: 'button' as const,
                  label: 'Delete',
                  icon: Trash2,
                  variant: 'danger' as const,
                  onApply: bulkDelete,
                }]
              : []),
          ]}
        />
      </div>
    </>
  );
}
