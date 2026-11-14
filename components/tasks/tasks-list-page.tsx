import Link from 'next/link';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { hasCapabilities } from '@/lib/auth/capabilities-cache';
import { listTasks, countTasks, enrichTasksWithLabels, enrichTasksWithProgress, enrichTasksWithTimeSpent } from '@/lib/repositories/tasks';
import { listTeamUsers } from '@/lib/repositories/clients';
import { listSubServices } from '@/lib/repositories/services';
import { listLabels } from '@/lib/repositories/task-custom-fields';
import { todayIST } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { PullToRefreshWrapper } from '@/components/ui/pull-to-refresh-wrapper';
import { Button } from '@/components/ui/button';
import { FullExport } from '@/components/reports/full-export';
import EmptyState from '@/components/sophistication/empty-state';
import NewTaskDialog from '@/components/tasks/new-task-dialog';
import AdvancedTaskFilters from '@/components/tasks/advanced-task-filters';
import { TaskViewWrapper } from '@/components/tasks/task-view-wrapper';
import { TaskLabelFilterBar } from '@/components/tasks/task-label-filter-bar';
import { TaskSearchBox } from '@/components/tasks/task-search-box';
import { TaskQuickFilters } from '@/components/tasks/task-quick-filters';
import { TaskSummaryTiles, type TileView } from '@/components/tasks/task-summary-tiles';
import { taskTiles, tileFilterOpts, tileHref, tileIsActive } from '@/lib/tasks/tiles';
import { ReassignAllMatching } from '@/components/tasks/reassign-all-matching';
import { parseTaskFilterParams, type TaskFilterParams } from '@/lib/tasks/filter-params';
import AdminTasksTable from '@/app/admin/tasks/tasks-table';
import TeamTasksTable from '@/app/team/tasks/tasks-table-client';
import { Layers, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

export type TasksSearchParams = {
  status?: string; priority?: string; assigned?: string; client?: string; sub_service?: string;
  due_from?: string; due_to?: string; page?: string; period_year?: string; period_month?: string;
  is_billable?: string; is_stuck?: string; is_verified?: string; verification?: string; label?: string | string[]; q?: string;
};

function buildTaskUrl(base: string, sp: Record<string, string | string[] | undefined>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...overrides })) {
    if (v === undefined || v === '' || v === '__none__') continue;
    if (Array.isArray(v)) v.forEach((item) => params.append(k, item));
    else params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

const addDaysIso = (n: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + n * 86_400_000));

/**
 * Shared task list for /admin/tasks and /team/tasks. The two routes differ only in
 * who may open them, which table component they use and a few labels, so one
 * implementation serves both and the route files stay a few lines long.
 */
export default async function TasksListPage({
  variant,
  searchParams,
}: {
  variant: 'admin' | 'team';
  searchParams: TasksSearchParams;
}) {
  const isAdminView = variant === 'admin';
  const me = isAdminView ? await requireRole('admin') : await requireRole(['admin', 'team']);
  if (isAdminView) await requireCapabilityOrRedirect(me, 'tasks.view');

  const currentPage = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  // Same parser the "reassign all matching" action uses, so both agree on the matching set.
  const baseFilter = parseTaskFilterParams(searchParams);

  const caps = await hasCapabilities(me, ['tasks.view', 'tasks.create', 'tasks.edit', 'tasks.complete', 'tasks.delete', 'tasks.assign']);
  const canAssign = me.role === 'admin' || caps.has('tasks.assign');
  const isAdmin = me.role === 'admin';
  const canViewAll = isAdmin || caps.has('tasks.view');
  const canCreate = isAdmin || caps.has('tasks.create');
  const canEdit = isAdmin || caps.has('tasks.edit');
  const canComplete = isAdmin || caps.has('tasks.complete');
  const canDelete = isAdmin || caps.has('tasks.delete');

  // The team view defaults to the user's own tasks unless they may see everyone's.
  const assignedTo = searchParams.assigned ?? (!isAdminView && !canViewAll ? me.id : undefined);
  const filterOpts = { ...baseFilter, assignedTo };

  const todayIso = todayIST();

  // The summary tiles count the whole result for their own scope, keeping every other filter that is applied.
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(searchParams)) if (typeof v === 'string') flat[k] = v;
  const tiles = taskTiles({ todayIso, weekEndIso: addDaysIso(7), yesterdayIso: addDaysIso(-1), isAdmin: isAdminView });
  const base = `/${variant}/tasks`;

  const [rawTasks, team, subServices, totalCount, allLabels, tileCounts] = await Promise.all([
    listTasks({ ...filterOpts, limit: PAGE_SIZE, offset }),
    listTeamUsers(),
    listSubServices(),
    countTasks(filterOpts),
    listLabels(),
    Promise.all(tiles.map((tile) => countTasks({ ...tileFilterOpts(tile, flat), labels: baseFilter.labels, assignedTo: tileFilterOpts(tile, flat).assignedTo ?? assignedTo }))),
  ]);
  const tileViews: TileView[] = tiles.map((tile, i) => ({
    tile,
    count: tileCounts[i],
    href: tileHref(tile, flat, base),
    active: tileIsActive(tile, flat),
  }));

  const [tasksWithLabels, tasksWithProgress, tasksWithTime] = await Promise.all([
    enrichTasksWithLabels(rawTasks),
    enrichTasksWithProgress(rawTasks),
    enrichTasksWithTimeSpent(rawTasks),
  ]);
  const tasks = tasksWithLabels.map((t, i) => ({ ...t, ...tasksWithProgress[i], minutes_logged: tasksWithTime[i].minutes_logged }));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));


  const showCreateTools = isAdminView || canCreate;

  const body = (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        subtitle={isAdminView ? 'Operational oversight of active engagements and team workflows.' : `${tasks.length} task${tasks.length === 1 ? '' : 's'} in this view.`}
        actions={
          <>
            <FullExport source={{ kind: 'tasks', filters: { ...searchParams, assigned: assignedTo, page: undefined } as TaskFilterParams }} label="tasks" filename="tasks" total={totalCount} />
            {showCreateTools && (
              <NewTaskDialog
                team={team ?? []}
                allSubServices={subServices ?? []}
                mode={variant}
                currentUserId={me.id}
                {...(isAdminView ? { triggerLabel: 'New task', triggerVariant: 'default' as const } : {})}
              />
            )}
            {showCreateTools && (
              <>
                <Link href={`${base}/import`}>
                  <Button variant="outline" size="sm"><Inbox className="h-4 w-4 mr-1" /> Import</Button>
                </Link>
                <Link href={`${base}/bulk-create`}>
                  <Button variant="outline" size="sm"><Layers className="h-4 w-4 mr-1" /> Bulk create</Button>
                </Link>
              </>
            )}
          </>
        }
      />

      <TaskSummaryTiles tiles={tileViews} />

      <div className="tff-card p-3 space-y-3">
        <TaskSearchBox />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TaskQuickFilters meId={me.id} todayIso={todayIso} weekEndIso={addDaysIso(7)} yesterdayIso={addDaysIso(-1)} />
          {canAssign && totalCount > 0 && (
            <ReassignAllMatching
              total={totalCount}
              team={(team ?? []).map((m: { id: string; full_name: string }) => ({ id: m.id, full_name: m.full_name }))}
              filters={{ ...searchParams, assigned: assignedTo, page: undefined } as TaskFilterParams}
            />
          )}
        </div>
        <AdvancedTaskFilters team={team ?? []} subServices={subServices ?? []} />
        <TaskLabelFilterBar labels={allLabels ?? []} />
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title={isAdminView ? 'No tasks found' : 'No tasks here yet'}
          body={isAdminView
            ? 'Try adjusting your filters or create a task using the New task button above.'
            : 'Tasks are auto-created from sub-services on the 1st of every month, or you can add one manually now.'}
          variant="tasks"
        />
      ) : (
        <>
          <TaskViewWrapper tasks={tasks} hrefPrefix={base}>
            {isAdminView ? (
              <AdminTasksTable tasks={tasks as any} todayIso={todayIso} team={team ?? []} canDelete={canDelete} />
            ) : (
              <TeamTasksTable tasks={tasks as any} todayIso={todayIso} canEdit={canEdit} canComplete={canComplete} canDelete={canDelete} isAdmin={isAdmin} />
            )}
          </TaskViewWrapper>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-zinc-500">
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <PageLink href={currentPage > 1 ? buildTaskUrl(base, searchParams, { page: String(currentPage - 1) }) : null} label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </PageLink>
                <span className="px-3 text-sm font-medium text-zinc-700">Page {currentPage} of {totalPages}</span>
                <PageLink href={currentPage < totalPages ? buildTaskUrl(base, searchParams, { page: String(currentPage + 1) }) : null} label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </PageLink>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return isAdminView ? body : <PullToRefreshWrapper>{body}</PullToRefreshWrapper>;
}

function PageLink({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  if (!href) {
    return (
      <span aria-disabled="true" className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-100 text-zinc-300">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
    >
      {children}
    </Link>
  );
}
