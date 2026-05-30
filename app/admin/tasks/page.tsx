import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listTasks } from '@/lib/repositories/tasks';
import { listAccessibleClients, listTeamUsers } from '@/lib/repositories/clients';
import { listSubServicesCached } from '@/lib/repositories/services';
import { listSavedViews } from '@/lib/actions/saved-views';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Briefcase, AlertTriangle, Clock, Layers } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import TasksTable from './tasks-table';
import { TaskViewWrapper } from '@/components/tasks/task-view-wrapper';
import EmptyState from '@/components/sophistication/empty-state';
import NewTaskDialog from '@/components/tasks/new-task-dialog';
import SavedViewsBar from '@/components/sophistication/saved-views-bar';
import FilterBar from '@/components/sophistication/filter-bar';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

function buildTaskUrl(base: string, sp: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...overrides })) {
    if (v !== undefined && v !== '' && v !== '__none__') params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function AdminTasksPage({ searchParams }: { searchParams: { status?: string; priority?: string; assigned?: string; client?: string; sub_service?: string; due_from?: string; due_to?: string } }) {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'tasks.create');

  const status = searchParams.status?.split(',').filter(Boolean) as any;
  const priority = searchParams.priority?.split(',').filter(Boolean) as any;

  const [tasks, clients, team, subServices, views] = await Promise.all([
    listTasks({
      status,
      priority,
      assignedTo: searchParams.assigned,
      clientId: searchParams.client,
      subServiceId: searchParams.sub_service,
      dueFrom: searchParams.due_from,
      dueTo: searchParams.due_to,
    }),
    listAccessibleClients(),
    listTeamUsers(),
    listSubServicesCached(),
    listSavedViews('admin.tasks'),
  ]);

  const { todayIST } = await import('@/lib/utils');
  const todayIso = todayIST();
  const total = tasks?.length ?? 0;
  const stuck = tasks?.filter((t: any) => t.is_stuck || t.priority === 'high').length ?? 0;
  const dueToday = tasks?.filter((t: any) => t.due_date === todayIso).length ?? 0;

  const statusFilters = [
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
        subtitle="Operational oversight of active engagements and team workflows."
        actions={
          <>
            <ExportButton data={exportData} filename="tasks-export" format="csv" />
            <NewTaskDialog clients={(clients ?? []) as any} team={team as any} triggerLabel="New task" triggerVariant="default" mode="admin" />
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

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {statusFilters.map((f) => (
            <Link
              key={f.value}
              href={buildTaskUrl('/admin/tasks', searchParams, { status: f.value || undefined })}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs',
                (searchParams.status ?? '') === f.value
                  ? 'border-teal-500 bg-teal-50 text-teal-800'
                  : 'border-zinc-200 hover:bg-zinc-50'
              )}
            >{f.label}</Link>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {priorityFilters.map((f) => (
            <Link
              key={f.value}
              href={buildTaskUrl('/admin/tasks', searchParams, { priority: f.value || undefined })}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs',
                (searchParams.priority ?? '') === f.value
                  ? 'border-amber-500 bg-amber-50 text-amber-800'
                  : 'border-zinc-200 hover:bg-zinc-50'
              )}
            >{f.label}</Link>
          ))}
        </div>
        <FilterBar
          selects={[
            { key: 'assigned', placeholder: 'All assignees', options: team.map((u: any) => ({ value: u.id, label: u.full_name })) },
            { key: 'client', placeholder: 'All clients', options: clients.map((c: any) => ({ value: c.id, label: c.business_name })) },
            { key: 'sub_service', placeholder: 'All sub-services', options: subServices.map((s: any) => ({ value: s.id, label: `${s.services?.name ?? ''} › ${s.name}` })) },
          ]}
          inputs={[
            { key: 'due_from', placeholder: 'Due from', type: 'date' },
            { key: 'due_to', placeholder: 'Due to', type: 'date' },
          ]}
        />
        <SavedViewsBar scope="admin.tasks" views={views as any} />
      </div>

      {(!tasks || tasks.length === 0) ? (
        <EmptyState
          title="No tasks found"
          body="Try adjusting your filters or create a task using the New task button above."
          icon={<Briefcase className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <TaskViewWrapper tasks={tasks as any} hrefPrefix="/admin/tasks">
          <TasksTable tasks={tasks as any} todayIso={todayIso} />
        </TaskViewWrapper>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: 'zinc' | 'red' | 'amber' }) {
  const toneCls = tone === 'zinc' ? 'bg-zinc-100 text-zinc-600' : tone === 'red' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600';
  return (
    <div className="tff-card p-5 transition-all duration-200 hover:shadow-sm">
      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', toneCls)}>{icon}</div>
      <div className="mt-3">
        <div className="text-2xl font-bold tabular-nums tracking-tight text-zinc-900">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mt-1">{label}</div>
      </div>
    </div>
  );
}
