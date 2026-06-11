import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listTasks, countTasks, enrichTasksWithLabels, enrichTasksWithProgress } from '@/lib/repositories/tasks';
import { listAccessibleClients, listTeamUsers } from '@/lib/repositories/clients';
import { listSubServices } from '@/lib/repositories/services';
import { listLabels } from '@/lib/repositories/task-custom-fields';
import { listSavedViews } from '@/lib/actions/saved-views';
import AdvancedTaskFilters from '@/components/tasks/advanced-task-filters';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Briefcase, AlertTriangle, Clock, Layers, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import TasksTable from './tasks-table';
import { TaskViewWrapper } from '@/components/tasks/task-view-wrapper';
import EmptyState from '@/components/sophistication/empty-state';
import NewTaskDialog from '@/components/tasks/new-task-dialog';
import SavedViewsBar from '@/components/sophistication/saved-views-bar';
import FilterBar from '@/components/sophistication/filter-bar';
import { Button } from '@/components/ui/button';
import { TaskLabelFilterBar } from '@/components/tasks/task-label-filter-bar';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

function buildTaskUrl(base: string, sp: Record<string, string | string[] | undefined>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...overrides })) {
    if (v === undefined || v === '' || v === '__none__') continue;
    if (Array.isArray(v)) {
      v.forEach((item) => params.append(k, item));
    } else {
      params.set(k, v);
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function AdminTasksPage({ searchParams }: { searchParams: { status?: string; priority?: string; assigned?: string; client?: string; sub_service?: string; due_from?: string; due_to?: string; page?: string; period_year?: string; period_month?: string; is_billable?: string; is_stuck?: string; is_verified?: string; label?: string | string[]; q?: string } }) {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'tasks.view');

  const status = (searchParams.status?.split(',').filter(Boolean) ?? []) as Array<import('@/lib/validation/schemas').TaskStatus | 'blocked' | 'stuck'>;
  const priority = searchParams.priority?.split(',').filter(Boolean) ?? [];
  const currentPage = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const labelFilter = Array.isArray(searchParams.label)
    ? searchParams.label
    : searchParams.label
      ? [searchParams.label]
      : undefined;

  const filterOpts = {
    status,
    priority,
    assignedTo: searchParams.assigned,
    clientId: searchParams.client,
    subServiceIds: searchParams.sub_service ? [searchParams.sub_service] : undefined,
    dueFrom: searchParams.due_from,
    dueTo: searchParams.due_to,
    periodYear: searchParams.period_year ? parseInt(searchParams.period_year, 10) : undefined,
    periodMonth: searchParams.period_month ? parseInt(searchParams.period_month, 10) : undefined,
    isBillable: searchParams.is_billable === 'true' ? true : searchParams.is_billable === 'false' ? false : undefined,
    isStuck: searchParams.is_stuck === 'true' ? true : searchParams.is_stuck === 'false' ? false : undefined,
    isVerified: searchParams.is_verified === 'true' ? true : searchParams.is_verified === 'false' ? false : undefined,
    labels: labelFilter,
    q: searchParams.q,
  };

  const [rawTasks, clients, team, subServices, views, totalCount, allLabels] = await Promise.all([
    listTasks({ ...filterOpts, limit: PAGE_SIZE, offset }),
    listAccessibleClients(),
    listTeamUsers(),
    listSubServices(),
    listSavedViews('admin.tasks'),
    countTasks(filterOpts),
    listLabels(),
  ]);

  let tasks = await enrichTasksWithLabels(rawTasks);
  tasks = await enrichTasksWithProgress(tasks);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const { todayIST } = await import('@/lib/utils');
  const todayIso = todayIST();
  const total = totalCount;
  const stuck = tasks?.filter((t: any) => t.is_stuck || t.priority === 'high').length ?? 0;
  const dueToday = tasks?.filter((t: any) => t.due_date === todayIso).length ?? 0;

  const exportData = (tasks ?? []).map((t: any) => ({
    task_number: t.task_number ?? '',
    title: t.title,
    client: t.clients?.business_name ?? '',
    status: t.status,
    priority: t.priority,
    due_date: t.due_date ?? '',
    assigned_to: t.users_profile?.full_name ?? '',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        subtitle="Operational oversight of active engagements and team workflows."
        actions={
          <>
            <ExportButton data={exportData} filename="tasks-export" format="csv" />
            <NewTaskDialog clients={clients ?? []} team={team ?? []} allSubServices={subServices ?? []} triggerLabel="New task" triggerVariant="default" mode="admin" currentUserId={me.id} />
            <Link href="/admin/tasks/import">
              <Button variant="outline" size="sm"><Inbox className="h-4 w-4 mr-1" /> Import</Button>
            </Link>
            <Link href="/admin/tasks/bulk-create">
              <Button variant="outline" size="sm"><Layers className="h-4 w-4 mr-1" /> Bulk create</Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Active" value={total} icon={<Briefcase className="h-4 w-4" />} tone="zinc" />
        <StatCard label="Stuck or high-priority" value={stuck} icon={<AlertTriangle className="h-4 w-4" />} tone="red" />
        <StatCard label="Due today" value={dueToday} icon={<Clock className="h-4 w-4" />} tone="amber" />
      </div>

      <div className="space-y-3">
        <AdvancedTaskFilters 
          clients={clients ?? []} 
          team={team ?? []} 
          subServices={subServices ?? []} 
        />
        <TaskLabelFilterBar labels={allLabels ?? []} />
        <SavedViewsBar scope="admin.tasks" views={views ?? []} />
      </div>

      {(!tasks || tasks.length === 0) ? (
        <EmptyState
          title="No tasks found"
          body="Try adjusting your filters or create a task using the New task button above."
          icon={<Briefcase className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <>
          <TaskViewWrapper tasks={tasks ?? []} hrefPrefix="/admin/tasks">
            <TasksTable tasks={tasks ?? []} todayIso={todayIso} team={team ?? []} />
          </TaskViewWrapper>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-zinc-500">
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-1">
                {currentPage > 1 ? (
                  <Link
                    href={buildTaskUrl('/admin/tasks', searchParams, { page: String(currentPage - 1) })}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-100 text-zinc-300">
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                )}
                <span className="px-3 text-sm font-medium text-zinc-700">
                  Page {currentPage} of {totalPages}
                </span>
                {currentPage < totalPages ? (
                  <Link
                    href={buildTaskUrl('/admin/tasks', searchParams, { page: String(currentPage + 1) })}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-100 text-zinc-300">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: 'zinc' | 'red' | 'amber' }) {
  const toneCls = tone === 'zinc' ? 'bg-zinc-100 text-zinc-600' : tone === 'red' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600';
  return (
    <div className="tff-card p-5 transition-colors hover:border-zinc-300">
      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', toneCls)}>{icon}</div>
      <div className="mt-3">
        <div className="text-2xl font-bold tabular-nums tracking-tight text-zinc-900">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mt-1">{label}</div>
      </div>
    </div>
  );
}
