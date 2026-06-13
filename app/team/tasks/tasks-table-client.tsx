'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { useDebouncedCallback } from '@/lib/hooks/use-debounced-callback';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { DockLink } from '@/components/shell/dock-link';
import { TaskHoverCard } from '@/components/tasks/task-hover-card';
import { EditableCell } from '@/components/tasks/editable-cell';
import { Badge } from '@/components/ui/badge';
import { getStatusColour } from '@/lib/semantic-colours';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressMicro } from '@/components/ui/progress-micro';
import { formatDateIST, cn } from '@/lib/utils';
import BulkActionsBar from '@/components/sophistication/bulk-actions-bar';
import { transitionTaskAction, updateTaskAction } from '@/lib/actions/tasks';
import { TaskLabelPills } from '@/components/tasks/task-label-pills';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { ShieldCheck, User, Check, Search, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
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
  is_verified?: boolean;
  is_stuck?: boolean;
  clients?: { business_name: string } | null;
  users_profile?: { id: string; full_name: string; email: string } | null;
  sub_services?: { id: string; code: string; name: string } | null;
  labels?: { code: string; display_name: string; color_hex: string | null }[];
  progress_pct?: number;
  step_total?: number;
  step_completed?: number;
}

const COL_WIDTHS: Record<string, string> = {
  select: '40px',
  task_number: '80px',
  client: '150px',
  sub_service: '180px',
  period: '90px',
  status: '90px',
  due_date: '100px',
  owner: '120px',
  labels: '100px',
  progress: '90px',
  priority: '100px',
  verified: '80px',
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

const DEFAULT_COLUMNS = [
  { key: 'select', label: 'Select', visible: true, optional: false },
  { key: 'task_number', label: 'Number', visible: true, optional: true },
  { key: 'client', label: 'Client', visible: true, optional: false },
  { key: 'sub_service', label: 'Sub Service', visible: true, optional: false },
  { key: 'period', label: 'Period', visible: true, optional: false },
  { key: 'status', label: 'Status', visible: true, optional: false },
  { key: 'due_date', label: 'Due', visible: true, optional: false },
  { key: 'owner', label: 'Owner', visible: true, optional: true },
  { key: 'labels', label: 'Labels', visible: true, optional: true },
  { key: 'progress', label: 'Progress', visible: true, optional: true },
  { key: 'priority', label: 'Priority', visible: true, optional: true },
  { key: 'verified', label: 'Verified', visible: true, optional: true },
];

export default function TasksTableClient({ tasks, todayIso, canEdit = false, canComplete = false }: { tasks: TaskRow[]; todayIso?: string; canEdit?: boolean; canComplete?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const search = searchParams.get('q') ?? '';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const { columns, setColumns, density, setDensity } = useTablePrefs('team-tasks', DEFAULT_COLUMNS, 'comfortable');

  const parentRef = useRef<HTMLDivElement>(null);

  const onSearch = useDebouncedCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    const v = e.target.value.trim();
    if (v) params.set('q', v);
    else params.delete('q');
    params.delete('page');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }, 300);

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
    estimateSize: () => density === 'compact' ? 40 : 52,
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
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-zinc-300" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-teal-600" /> : <ArrowDown className="h-3 w-3 text-teal-600" />;
  }

  const colVisible = (key: string) => columns.find((c) => c.key === key)?.visible ?? true;
  const gridTemplateColumns = getGridCols(columns);
  const rowHeight = density === 'compact' ? 40 : 52;

  return (
    <>
      {/* Mobile cards with swipe */}
      <div className="space-y-3 md:hidden">
        {tasks.map((t) => {
          const overdue = t.due_date && todayIso && t.due_date < todayIso && t.status !== 'completed';
          const dueSoon = t.due_date && todayIso && t.due_date === todayIso && t.status !== 'completed';
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
              <div className={cn('bg-white border border-zinc-200 rounded-xl p-4 space-y-2', urgencyBorder)}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-500">{t.task_number ?? '—'}</span>
                  <Badge className={cn('text-[10px]', getStatusColour(t.status).bg, getStatusColour(t.status).text, getStatusColour(t.status).border)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', getStatusColour(t.status).dot)} />
                    {t.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900">{t.sub_services?.name ?? t.title.split(' — ')[0]}</p>
                  <p className="text-xs text-zinc-500">{t.clients?.business_name ?? '—'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 tabular-nums">
                    {t.period_month && t.period_year
                      ? `${new Date(t.period_year, t.period_month - 1).toLocaleString('default', { month: 'short' })} ${t.period_year}`
                      : t.period_quarter && t.period_year
                      ? `Q${t.period_quarter} ${t.period_year}`
                      : t.period_year
                      ? String(t.period_year)
                      : '—'}
                  </span>
                  <span className={cn('text-xs tabular-nums', overdue ? 'text-red-600 font-medium' : dueSoon ? 'text-amber-600 font-medium' : 'text-zinc-500')}>
                    {formatDateIST(t.due_date)}
                  </span>
                </div>
                {t.users_profile?.full_name && (
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500">
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search tasks…"
              defaultValue={search}
              onChange={onSearch}
              className="pl-9 pr-3 h-9 rounded-md border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 w-60"
            />
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <TableToolbar
              columns={columns}
              onColumnsChange={setColumns}
              density={density}
              onDensityChange={setDensity}
            />
            <div className="text-sm text-zinc-500">
              {tasks.length} tasks
            </div>
          </div>
        </div>

        <div ref={parentRef} className="tff-card overflow-auto border border-zinc-200 rounded-xl" style={{ height: '60vh' }}>
          {/* Sticky header */}
          <div className="sticky top-0 z-10 grid items-center bg-zinc-50/80 backdrop-blur-sm border-b border-zinc-200 px-4 h-12" style={{ gridTemplateColumns }}>
            {colVisible('select') && (
              <div>
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" data-testid="task-select-all" />
              </div>
            )}
            {colVisible('task_number') && (
              <button className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1" onClick={() => toggleSort('task_number')}>
                No <SortIcon col="task_number" />
              </button>
            )}
            {colVisible('client') && (
              <button className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1" onClick={() => toggleSort('client')}>
                Client <SortIcon col="client" />
              </button>
            )}
            {colVisible('sub_service') && (
              <button className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1" onClick={() => toggleSort('sub_service')}>
                Sub Service <SortIcon col="sub_service" />
              </button>
            )}
            {colVisible('period') && (
              <button className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1" onClick={() => toggleSort('period')}>
                Period <SortIcon col="period" />
              </button>
            )}
            {colVisible('status') && (
              <span className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</span>
            )}
            {colVisible('due_date') && (
              <button className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1" onClick={() => toggleSort('due_date')}>
                Due <SortIcon col="due_date" />
              </button>
            )}
            {colVisible('owner') && (
              <button className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1" onClick={() => toggleSort('owner')}>
                Owner <SortIcon col="owner" />
              </button>
            )}
            {colVisible('labels') && (
              <span className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Labels</span>
            )}
            {colVisible('progress') && (
              <span className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Progress</span>
            )}
            {colVisible('priority') && (
              <span className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Priority</span>
            )}
            {colVisible('verified') && (
              <span className="sr-only">Verified</span>
            )}
          </div>

          {/* Virtual body */}
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const t = filtered[virtualRow.index];
              const overdue = t.due_date && todayIso && t.due_date < todayIso && t.status !== 'completed';
              const dueSoon = t.due_date && todayIso && t.due_date === todayIso && t.status !== 'completed';
              const urgencyBorder = overdue ? 'border-l-2 border-l-red-500' : dueSoon ? 'border-l-2 border-l-amber-500' : t.status === 'in_progress' ? 'border-l-2 border-l-teal-500' : '';
              return (
                <div
                  key={t.id}
                  className={cn(
                    'absolute left-0 w-full grid items-center px-4 border-b border-zinc-100 hover:bg-zinc-50/60 transition-colors',
                    selected.has(t.id) ? 'bg-teal-50/40' : '',
                    urgencyBorder
                  )}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns,
                  }}
                  data-testid={`task-row-${t.id}`}
                >
                  {colVisible('select') && (
                    <div className="min-w-0 overflow-hidden">
                      <Checkbox
                        checked={selected.has(t.id)}
                        onCheckedChange={() => toggle(t.id)}
                        aria-label={`Select task ${t.sub_services?.name ?? t.title}`}
                        data-testid={`task-select-${t.id}`}
                      />
                    </div>
                  )}
                  {colVisible('task_number') && (
                    <div className="min-w-0 overflow-hidden">
                      <span className="text-xs font-mono tabular-nums text-zinc-500">{t.task_number ?? '—'}</span>
                    </div>
                  )}
                  {colVisible('client') && (
                    <div className="min-w-0 overflow-hidden text-sm text-zinc-500 truncate pr-2">{t.clients?.business_name ?? '—'}</div>
                  )}
                  {colVisible('sub_service') && (
                    <div className="min-w-0 overflow-hidden pr-2">
                      <TaskHoverCard taskId={t.id}>
                        <DockLink item={{ type: 'task', id: t.id }} href={`/team/tasks/${t.id}`} className="font-semibold text-zinc-900 hover:text-teal-700 truncate block text-sm">
                          {t.sub_services?.name ?? t.title.split(' — ')[0]}
                        </DockLink>
                      </TaskHoverCard>
                      {t.labels && t.labels.length > 0 && (
                        <div className="mt-1">
                          <TaskLabelPills labels={t.labels} maxVisible={2} size="xs" />
                        </div>
                      )}
                    </div>
                  )}
                  {colVisible('period') && (
                    <div className="min-w-0 overflow-hidden">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 tabular-nums">
                        {t.period_month && t.period_year
                          ? `${new Date(t.period_year, t.period_month - 1).toLocaleString('default', { month: 'short' })} ${t.period_year}`
                          : t.period_quarter && t.period_year
                          ? `Q${t.period_quarter} ${t.period_year}`
                          : t.period_year
                          ? String(t.period_year)
                          : '—'}
                      </span>
                    </div>
                  )}
                  {colVisible('status') && (
                    <div className="min-w-0 overflow-hidden">
                      {canComplete ? (
                        <EditableCell
                          value={t.status}
                          options={STATUS_OPTIONS}
                          onSave={(val) => handleUpdateStatus(t.id, val)}
                        />
                      ) : (
                        <Badge variant={(STATUS_OPTIONS.find((o) => o.value === t.status)?.color as any) || 'outline'}>
                          {STATUS_OPTIONS.find((o) => o.value === t.status)?.label || t.status}
                        </Badge>
                      )}
                      {t.is_stuck && (
                        <span className="text-[10px] font-medium text-red-600 flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" /> Stuck
                        </span>
                      )}
                    </div>
                  )}
                  {colVisible('due_date') && (
                    <div className={cn('min-w-0 overflow-hidden text-xs tabular-nums', overdue ? 'text-red-600 font-medium' : dueSoon ? 'text-amber-600 font-medium' : 'text-zinc-700')}>
                      {t.due_date ? formatDateIST(t.due_date) : '—'}
                    </div>
                  )}
                  {colVisible('owner') && (
                    <div className="min-w-0 overflow-hidden text-xs text-zinc-700 truncate pr-2">
                      {t.users_profile?.full_name ?? <span className="text-zinc-400">Unassigned</span>}
                    </div>
                  )}
                  {colVisible('labels') && (
                    <div className="min-w-0 overflow-hidden text-center">
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
                    </div>
                  )}
                  {colVisible('progress') && (
                    <div className="min-w-0 overflow-hidden text-center">
                      <ProgressMicro progress={t.progress_pct ?? 0} completed={t.step_completed ?? 0} total={t.step_total ?? 0} />
                    </div>
                  )}
                  {colVisible('priority') && (
                    <div className="min-w-0 overflow-hidden">
                      {canEdit ? (
                        <EditableCell
                          value={t.priority}
                          options={PRIORITY_OPTIONS}
                          onSave={(val) => handleUpdatePriority(t.id, val)}
                        />
                      ) : (
                        <Badge variant={(PRIORITY_OPTIONS.find((o) => o.value === t.priority)?.color as any) || 'outline'}>
                          {PRIORITY_OPTIONS.find((o) => o.value === t.priority)?.label || t.priority}
                        </Badge>
                      )}
                    </div>
                  )}
                  {colVisible('verified') && (
                    <div className="min-w-0 overflow-hidden">
                      {t.is_verified && (
                        <span className="text-[10px] font-medium text-teal-700 flex items-center gap-1 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5 w-fit">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                    </div>
                  )}
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
          ]}
        />
      </div>
    </>
  );
}
