'use client';
import { useState, useMemo, useTransition } from 'react';
import { useDebouncedCallback } from '@/lib/hooks/use-debounced-callback';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { DockLink } from '@/components/shell/dock-link';
import { TaskHoverCard } from '@/components/tasks/task-hover-card';
import { Badge } from '@/components/ui/badge';
import { getStatusColour, getPriorityColour } from '@/lib/semantic-colours';
import { Checkbox } from '@/components/ui/checkbox';

import { useConfirm } from '@/components/ui/use-confirm';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatDateIST, cn } from '@/lib/utils';
import {
  Search, Filter, AlertTriangle, Building2, ArrowUpRight, ArrowUpDown, ArrowUp, ArrowDown, ShieldCheck,
} from 'lucide-react';
import { TaskLabelPills } from '@/components/tasks/task-label-pills';
import { TableToolbar, useTablePrefs } from '@/components/ui/table-enhancements';
import BulkActionsBar from '@/components/sophistication/bulk-actions-bar';
import { ProgressMicro } from '@/components/ui/progress-micro';
import { transitionTaskAction, bulkDeleteTasksAction, bulkUpdateTasksAction } from '@/lib/actions/tasks';
import { toast } from 'sonner';

type Task = {
  id: string;
  task_number: string | null;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  period_year?: number | null;
  period_month?: number | null;
  period_quarter?: number | null;
  is_stuck: boolean;
  is_verified?: boolean;
  clients?: { business_name: string } | null;
  users_profile?: { full_name: string } | null;
  sub_services?: { id: string; code: string; name: string } | null;
  labels?: { code: string; display_name: string; color_hex: string | null }[];
  progress_pct?: number;
  step_total?: number;
  step_completed?: number;
};

const DEFAULT_COLUMNS = [
  { key: 'select', label: 'Select', visible: true, optional: false },
  { key: 'task_number', label: 'Number', visible: true, optional: true },
  { key: 'client', label: 'Client', visible: true, optional: false },
  { key: 'sub_service', label: 'Sub Service', visible: true, optional: false },
  { key: 'period', label: 'Period', visible: true, optional: false },
  { key: 'status', label: 'Status', visible: true, optional: false },
  { key: 'due', label: 'Due', visible: true, optional: false },
  { key: 'owner', label: 'Owner', visible: true, optional: true },
  { key: 'labels', label: 'Labels', visible: true, optional: true },
  { key: 'progress', label: 'Progress', visible: true, optional: true },
  { key: 'priority', label: 'Priority', visible: true, optional: true },
  { key: 'actions', label: 'Actions', visible: true, optional: false },
];

export default function TasksTable({ tasks, todayIso, team = [] }: { tasks: Task[]; todayIso: string; team?: { id: string; full_name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const search = searchParams.get('q') ?? '';
  const [sortKey, setSortKey] = useState<string>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [colSearch, setColSearch] = useState<Record<string, string>>({});
  const [ConfirmDialog, confirm] = useConfirm();
  const { columns, setColumns, density, setDensity } = useTablePrefs('admin-tasks', DEFAULT_COLUMNS, 'comfortable');

  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) {
      const name = t.users_profile?.full_name;
      if (name) map.set(name, name);
    }
    return Array.from(map.values()).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    let data = [...tasks];
    data.sort((a, b) => {
      let va: any = a[sortKey as keyof Task];
      let vb: any = b[sortKey as keyof Task];
      if (sortKey === 'client') {
        va = a.clients?.business_name ?? '';
        vb = b.clients?.business_name ?? '';
      }
      if (sortKey === 'owner') {
        va = a.users_profile?.full_name ?? '';
        vb = b.users_profile?.full_name ?? '';
      }
      if (sortKey === 'period') {
        va = a.period_year ?? 0;
        vb = b.period_year ?? 0;
        if (va === vb) {
          va = a.period_month ?? a.period_quarter ?? 0;
          vb = b.period_month ?? b.period_quarter ?? 0;
        }
      }
      if (sortKey === 'sub_service') {
        va = a.sub_services?.name ?? '';
        vb = b.sub_services?.name ?? '';
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
    let success = 0, failed = 0;
    await Promise.all(
      ids.map(async (id) => {
        const r = await transitionTaskAction({ task_id: id, to_status: status as import('@/lib/validation/schemas').TaskStatus });
        if (r.success) success++; else failed++;
      })
    );
    if (failed > 0) toast.warning(`${success} updated, ${failed} failed`);
    else toast.success(`${success} tasks updated`);
    setSelected(new Set());
    return { success, failed };
  }

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

  const statuses = ['all', 'pending', 'in_progress', 'completed', 'cancelled'];

  async function bulkDeleteTasks(ids: string[]) {
    let success = 0, failed = 0;
    
    const ok = await confirm({ title: 'Delete Tasks', description: `Are you sure you want to delete ${ids.length} task(s)?` });
    if (!ok) return { success: 0, failed: 0 };

    // Since bulkDeleteTasksAction takes the array and does Promise.all, we can just call it
    const { bulkDeleteTasksAction } = await import('@/lib/actions/tasks');
    const r = await bulkDeleteTasksAction(ids);
    if (r.success) {
      success = ids.length;
      toast.success(`Deleted ${success} tasks`);
    } else {
      failed = ids.length;
      toast.error(r.error);
    }
    
    setSelected(new Set());
    return { success, failed };
  }

  async function bulkUpdateAssignee(ids: string[], val?: string) {
    const r = await bulkUpdateTasksAction({ task_ids: ids, updates: { assigned_to: val === 'unassigned' ? null : val } });
    if (!r.success) {
      toast.error(r.error);
      return { success: 0, failed: ids.length };
    }
    return { success: r.data.success, failed: r.data.failed };
  }

  async function bulkUpdatePriority(ids: string[], val?: string) {
    const r = await bulkUpdateTasksAction({ task_ids: ids, updates: { priority: val as 'low' | 'medium' | 'high' | 'urgent' } });
    if (!r.success) {
      toast.error(r.error);
      return { success: 0, failed: ids.length };
    }
    return { success: r.data.success, failed: r.data.failed };
  }

  async function bulkUpdateBillable(ids: string[], val?: string) {
    const r = await bulkUpdateTasksAction({ task_ids: ids, updates: { is_billable: val === 'true' } });
    if (!r.success) {
      toast.error(r.error);
      return { success: 0, failed: ids.length };
    }
    return { success: r.data.success, failed: r.data.failed };
  }

  const colVisible = (key: string) => columns.find((c) => c.key === key)?.visible ?? true;
  const rowPadding = density === 'compact' ? 'py-1.5' : 'py-3';

  const onSearch = useDebouncedCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    const v = e.target.value.trim();
    if (v) params.set('q', v);
    else params.delete('q');
    params.delete('page');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }, 300);

  return (
    <div className="space-y-4">
      <ConfirmDialog />
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

      <div className="tff-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
              {colVisible('select') && (
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
              )}
              {colVisible('task_number') && (
                <TableHead className="cursor-pointer select-none w-24" onClick={() => toggleSort('task_number')}>
                  <span className="flex items-center gap-1">Number <SortIcon col="task_number" /></span>
                </TableHead>
              )}
              {colVisible('client') && (
                <TableHead className="cursor-pointer select-none w-40" onClick={() => toggleSort('client')}>
                  <span className="flex items-center gap-1">Client <SortIcon col="client" /></span>
                </TableHead>
              )}
              {colVisible('sub_service') && (
                <TableHead className="cursor-pointer select-none w-44" onClick={() => toggleSort('sub_service')}>
                  <span className="flex items-center gap-1">Sub Service <SortIcon col="sub_service" /></span>
                </TableHead>
              )}
              {colVisible('period') && (
                <TableHead className="cursor-pointer select-none w-24" onClick={() => toggleSort('period')}>
                  <span className="flex items-center gap-1">Period <SortIcon col="period" /></span>
                </TableHead>
              )}
              {colVisible('status') && (
                <TableHead className="text-center">Status</TableHead>
              )}
              {colVisible('due') && (
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('due_date')}>
                  <span className="flex items-center gap-1">Due <SortIcon col="due_date" /></span>
                </TableHead>
              )}
              {colVisible('owner') && (
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('owner')}>
                  <span className="flex items-center gap-1">Owner <SortIcon col="owner" /></span>
                </TableHead>
              )}
              {colVisible('labels') && (
                <TableHead className="text-center">Labels</TableHead>
              )}
              {colVisible('progress') && (
                <TableHead className="text-center">Progress</TableHead>
              )}
              {colVisible('priority') && (
                <TableHead className="text-center">Priority</TableHead>
              )}
              {colVisible('actions') && (
                <TableHead></TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => {
              const overdue = t.due_date && t.due_date < todayIso && t.status !== 'completed';
              const dueSoon = t.due_date && t.due_date === todayIso && t.status !== 'completed';
              const urgencyBorder = overdue ? 'border-l-2 border-l-red-500' : dueSoon ? 'border-l-2 border-l-amber-500' : t.status === 'in_progress' ? 'border-l-2 border-l-teal-500' : '';
              return (
                <TableRow key={t.id} className={cn('transition-colors hover:bg-zinc-50/60', selected.has(t.id) ? 'bg-teal-50/40' : '', urgencyBorder)} data-row>
                  {colVisible('select') && (
                    <TableCell className={rowPadding}>
                      <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} aria-label={`Select task ${t.sub_services?.name ?? t.title}`} />
                    </TableCell>
                  )}
                  {colVisible('task_number') && (
                    <TableCell className={rowPadding}>
                      <span className="text-xs font-mono tabular-nums text-zinc-500">{t.task_number ?? '—'}</span>
                    </TableCell>
                  )}
                  {colVisible('client') && (
                    <TableCell className={rowPadding}>
                      <span className="text-sm text-zinc-500 truncate block">{t.clients?.business_name ?? '—'}</span>
                    </TableCell>
                  )}
                  {colVisible('sub_service') && (
                    <TableCell className={rowPadding}>
                      <TaskHoverCard taskId={t.id}>
                        <DockLink item={{ type: 'task', id: t.id }} href={`/admin/tasks/${t.id}`} className="font-semibold text-zinc-900 hover:text-teal-700 text-sm truncate block">
                          {t.sub_services?.name ?? t.title}
                        </DockLink>
                      </TaskHoverCard>
                      {t.labels && t.labels.length > 0 && (
                        <div className="mt-1">
                          <TaskLabelPills labels={t.labels} maxVisible={2} size="xs" />
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
                  {colVisible('status') && (
                    <TableCell className={cn('text-center', rowPadding)}>
                      <div className="flex flex-col items-center gap-1">
                        <Badge className={cn('text-[10px]', getStatusColour(t.status).bg, getStatusColour(t.status).text, getStatusColour(t.status).border)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', getStatusColour(t.status).dot)} />
                          {t.status.replace('_', ' ')}
                        </Badge>
                        {t.is_verified && (
                          <span className="text-[10px] font-medium text-teal-700 flex items-center gap-1 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5">
                            <ShieldCheck className="h-3 w-3" /> Verified
                          </span>
                        )}
                        {t.is_stuck && (
                          <span className="text-[10px] font-medium text-red-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Stuck
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {colVisible('due') && (
                    <TableCell className={rowPadding}>
                      <span className={cn('text-xs tabular-nums', overdue ? 'text-red-600 font-medium' : dueSoon ? 'text-amber-600 font-medium' : 'text-zinc-700')}>
                        {t.due_date ? formatDateIST(t.due_date) : '—'}
                      </span>
                    </TableCell>
                  )}
                  {colVisible('owner') && (
                    <TableCell className={rowPadding}>
                      {t.users_profile?.full_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-semibold border border-teal-200">
                            {t.users_profile.full_name.slice(0, 1)}
                          </div>
                          <span className="text-xs text-zinc-700">{t.users_profile.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">Unassigned</span>
                      )}
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
                  {colVisible('priority') && (
                    <TableCell className={cn('text-center', rowPadding)}>
                      <Badge className={cn('text-[10px]', getPriorityColour(t.priority).bg, getPriorityColour(t.priority).text)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', getPriorityColour(t.priority).dot)} />
                        {t.priority ?? '—'}
                      </Badge>
                    </TableCell>
                  )}
                  {colVisible('actions') && (
                    <TableCell className={cn('text-right', rowPadding)}>
                      <DockLink
                        item={{ type: 'task', id: t.id }}
                        href={`/admin/tasks/${t.id}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                        aria-label="Open task"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </DockLink>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
          {
            type: 'select',
            label: 'Assignee',
            options: [
              { value: 'unassigned', label: 'Unassigned' },
              ...team.map(t => ({ value: t.id, label: t.full_name }))
            ],
            onApply: bulkUpdateAssignee,
          },
          {
            type: 'select',
            label: 'Priority',
            options: [
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ],
            onApply: bulkUpdatePriority,
          },
          {
            type: 'select',
            label: 'Billable',
            options: [
              { value: 'true', label: 'Mark as billable' },
              { value: 'false', label: 'Mark non-billable' },
            ],
            onApply: bulkUpdateBillable,
          },
          {
            type: 'button',
            label: 'Delete',
            variant: 'danger',
            onApply: bulkDeleteTasks,
          }
        ]}
      />
    </div>
  );
}
