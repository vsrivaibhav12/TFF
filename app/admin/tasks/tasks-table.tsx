'use client';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { DockLink } from '@/components/shell/dock-link';
import { Checkbox } from '@/components/ui/checkbox';

import { useConfirm } from '@/components/ui/use-confirm';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ResizableTableHead } from '@/components/ui/resizable-table-head';
import { useColumnWidths } from '@/lib/hooks/use-column-widths';
import { cn, displayTaskName } from '@/lib/utils';
import {
  ArrowUpRight, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { TableToolbar, useTablePrefs } from '@/components/ui/table-enhancements';
import BulkActionsBar from '@/components/sophistication/bulk-actions-bar';
import { TaskCellContent } from '@/components/tasks/task-cells';
import { transitionTaskAction, bulkUpdateTasksAction } from '@/lib/actions/tasks';
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
  period_key?: string | null;
  is_stuck: boolean;
  is_verified?: boolean;
  clients?: { business_name: string } | null;
  users_profile?: { full_name: string } | null;
  sub_services?: { id: string; code: string; name: string } | null;
  labels?: { code: string; display_name: string; color_hex: string | null }[];
  progress_pct?: number;
  minutes_logged?: number;
  step_total?: number;
  step_completed?: number;
};

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
  { key: 'actions', label: 'Actions', visible: true, optional: false },
];

/** Header text and the sort key for each sortable column. */
const HEAD: Record<string, { label: string; sort?: string }> = {
  task_number: { label: 'Number', sort: 'task_number' },
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
};

export default function TasksTable({ tasks, todayIso, team = [], canDelete = false }: { tasks: Task[]; todayIso: string; team?: { id: string; full_name: string }[]; canDelete?: boolean }) {
  const searchParams = useSearchParams();
  const [sortKey, setSortKey] = useState<string>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [colSearch, setColSearch] = useState<Record<string, string>>({});
  const [ConfirmDialog, confirm] = useConfirm();
  const { columns, setColumns, density, setDensity, resetLayout } = useTablePrefs(TASK_TABLE_ID, DEFAULT_COLUMNS, 'compact');
  const { widths, setWidth, loaded } = useColumnWidths('admin-tasks-v4', {
    select: 40,
    task_number: 90,
    sub_service: 280,
    client: 220,
    period: 100,
    progress: 84,
    due_date: 110,
    status: 140,
    time_spent: 84,
    owner: 130,
    labels: 140,
    priority: 100,
    actions: 44,
  });

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
  const visibleCols = columns.filter((c) => c.visible);
  const cellCtx = { todayIso, base: '/admin', canEdit: true, isAdmin: true };
  const rowPadding = density === 'compact' ? 'py-1' : 'py-2.5';


  return (
    <div className="space-y-4">
      <ConfirmDialog />
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 ml-auto">
          <TableToolbar
            columns={columns}
            onColumnsChange={setColumns}
            density={density}
            onDensityChange={setDensity}
            onReset={resetLayout}
          />
          <div className="text-sm text-zinc-500">
            {tasks.length} tasks
          </div>
        </div>
      </div>

      <div className="tff-card overflow-x-auto">
        <Table className="min-w-[1000px]" style={{ tableLayout: 'fixed' }}>
          <TableHeader>
            <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
              {visibleCols.map((c) => {
                if (c.key === 'select') {
                  return (
                    <TableHead key={c.key} className="w-10">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                    </TableHead>
                  );
                }
                if (c.key === 'actions') return <TableHead key={c.key} />;
                const h = HEAD[c.key] ?? { label: c.label };
                return (
                  <ResizableTableHead
                    key={c.key}
                    className={cn(h.sort && 'cursor-pointer select-none')}
                    width={loaded ? widths[c.key] : undefined}
                    onResize={(w) => setWidth(c.key, w)}
                    onClick={h.sort ? () => toggleSort(h.sort!) : undefined}
                  >
                    <span className="flex items-center gap-1">{h.label}{h.sort && <SortIcon col={h.sort} />}</span>
                  </ResizableTableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id} className={cn('group/row transition-colors', selected.has(t.id) && 'bg-[#E6F6F3]/60')} data-row>
                {visibleCols.map((c) => {
                  if (c.key === 'select') {
                    return (
                      <TableCell key={c.key} className={rowPadding}>
                        <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} aria-label={`Select task ${displayTaskName(t)}`} />
                      </TableCell>
                    );
                  }
                  if (c.key === 'actions') {
                    return (
                      <TableCell key={c.key} className={cn('text-right', rowPadding)}>
                        <DockLink
                          item={{ type: 'task', id: t.id }}
                          href={`/admin/tasks/${t.id}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-900 group-hover/row:opacity-100"
                          aria-label="Open task"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </DockLink>
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell key={c.key} className={cn('overflow-hidden', rowPadding)}>
                      <TaskCellContent col={c.key} t={t as never} ctx={cellCtx} />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
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
          ...(canDelete
            ? [{
                type: 'button' as const,
                label: 'Delete',
                icon: Trash2,
                variant: 'danger' as const,
                onApply: bulkDeleteTasks,
              }]
            : []),
        ]}
      />
    </div>
  );
}
