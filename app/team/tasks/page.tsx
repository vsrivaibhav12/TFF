import Link from 'next/link';
import { listTasks, countTasks } from '@/lib/repositories/tasks';
import { listAccessibleClients, listTeamUsers } from '@/lib/repositories/clients';
import { listSubServices } from '@/lib/repositories/services';
import { listSavedViews } from '@/lib/actions/saved-views';
import { getCurrentUser } from '@/lib/auth/require-role';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import EmptyState from '@/components/sophistication/empty-state';
import SavedViewsBar from '@/components/sophistication/saved-views-bar';
import FilterBar from '@/components/sophistication/filter-bar';
import NewTaskDialog from '@/components/tasks/new-task-dialog';
import TasksTableClient from './tasks-table-client';
import { TaskViewWrapper } from '@/components/tasks/task-view-wrapper';
import { Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

function buildTaskUrl(base: string, sp: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...overrides })) {
    if (v !== undefined && v !== '' && v !== '__none__') params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function TeamTasksList({ searchParams }: { searchParams: { status?: string; priority?: string; assigned?: string; client?: string; sub_service?: string; due_from?: string; due_to?: string; page?: string } }) {
  const me = await getCurrentUser();
  const status = searchParams.status?.split(',').filter(Boolean) as any;
  const priority = searchParams.priority?.split(',').filter(Boolean) as any;
  // Default to showing the current user's assigned tasks unless a specific filter is set
  const assignedTo = searchParams.assigned ?? me?.id ?? undefined;
  const currentPage = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const filterOpts = { status, priority, assignedTo, clientId: searchParams.client, subServiceId: searchParams.sub_service, dueFrom: searchParams.due_from, dueTo: searchParams.due_to };

  const [tasks, clients, team, subServices, views, totalCount] = await Promise.all([
    listTasks({ ...filterOpts, limit: PAGE_SIZE, offset }),
    listAccessibleClients(),
    listTeamUsers(),
    listSubServices(),
    listSavedViews('team.tasks'),
    countTasks(filterOpts),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const filteredTasks = tasks;

  const filters = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'blocked', label: 'Awaiting client' },
    { value: 'stuck', label: 'Stuck' },
    { value: 'completed', label: 'Completed' },
  ];

  const priorityFilters = [
    { value: '', label: 'All priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

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
        subtitle={`${tasks.length} task${tasks.length === 1 ? '' : 's'} in this view.`}
        actions={
          <>
            <ExportButton data={exportData} filename="tasks-export" format="csv" />
            <NewTaskDialog clients={clients as any} team={team as any} mode="team" />
          </>
        }
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {filters.map((f) => (
              <Link
                key={f.value}
                href={buildTaskUrl('/team/tasks', searchParams, { status: f.value || undefined })}
                className={`rounded-md border px-3 py-1.5 text-xs ${(searchParams.status ?? '') === f.value ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-zinc-200 hover:bg-zinc-50'}`}
                data-testid={`filter-${f.value || 'all'}`}
              >{f.label}</Link>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {priorityFilters.map((f) => (
              <Link
                key={f.value}
                href={buildTaskUrl('/team/tasks', searchParams, { priority: f.value || undefined })}
                className={`rounded-md border px-3 py-1.5 text-xs ${(searchParams.priority ?? '') === f.value ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-zinc-200 hover:bg-zinc-50'}`}
              >{f.label}</Link>
            ))}
          </div>
        </div>
        <FilterBar
          selects={[
            { key: 'assigned', placeholder: 'All assignees', options: team.map((u: any) => ({ value: u.id, label: u.full_name })) },
            { key: 'client', placeholder: 'All clients', options: clients.map((c: any) => ({ value: c.id, label: c.business_name })) },
            { key: 'sub_service', placeholder: 'All sub-services', options: subServices.map((s: any) => ({ value: s.id, label: s.name })) },
          ]}
          inputs={[
            { key: 'due_from', placeholder: 'Due from', type: 'date' },
            { key: 'due_to', placeholder: 'Due to', type: 'date' },
          ]}
        />
        <SavedViewsBar scope="team.tasks" views={views as any} />
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks here yet"
          body="Tasks are auto-created from sub-services on the 1st of every month, or you can add one manually now."
          icon={<Briefcase className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <>
          <TaskViewWrapper tasks={filteredTasks as any} hrefPrefix="/team/tasks">
            <TasksTableClient tasks={filteredTasks as any} />
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
                    href={buildTaskUrl('/team/tasks', searchParams, { page: String(currentPage - 1) })}
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
                    href={buildTaskUrl('/team/tasks', searchParams, { page: String(currentPage + 1) })}
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
