import { requireRole } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import { listWorkDone } from '@/lib/repositories/work-done';
import { listAccessibleClients, listTeamUsers } from '@/lib/repositories/clients';
import { listTasks } from '@/lib/repositories/tasks';
import WorkDoneForm from './work-done-form';
import WorkDoneFilters from '@/components/operations/work-done-filters';
import WorkDoneRanges from '@/components/operations/work-done-ranges';
import WorkDoneTable from '@/components/operations/work-done-table';
import { displayTaskName } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';

export const dynamic = 'force-dynamic';

export default async function WorkDonePage({ searchParams }: { searchParams?: { from?: string; to?: string; q?: string; client?: string; task?: string; user?: string } }) {
  const me = await requireRole(['admin', 'team']);
  const canViewAll = await hasCapability(me, 'view_workdone_reports');
  const canManageWorkDone = await hasCapability(me, 'workdone.manage');

  const listOpts: Parameters<typeof listWorkDone>[0] = {};
  if (!canViewAll) listOpts.userId = me.id;
  if (searchParams?.from) listOpts.startDate = searchParams.from;
  if (searchParams?.to) listOpts.endDate = searchParams.to;
  if (searchParams?.q) listOpts.search = searchParams.q;
  if (searchParams?.client) listOpts.clientId = searchParams.client;
  if (searchParams?.task) listOpts.taskId = searchParams.task;
  if (canViewAll && searchParams?.user) listOpts.userId = searchParams.user;

  // Entries load only once a filter is applied, so opening the page stays fast.
  const hasFilter = Boolean(searchParams?.from || searchParams?.to || searchParams?.q || searchParams?.client || searchParams?.task || searchParams?.user);

  const [logs, clients, tasks, staff] = await Promise.all([
    hasFilter ? listWorkDone(listOpts) : Promise.resolve([]),
    listAccessibleClients(),
    listTasks(canViewAll ? { status: ['pending', 'in_progress'] } : { assignedTo: me.id, status: ['pending', 'in_progress'] }),
    canViewAll ? listTeamUsers() : Promise.resolve([]),
  ]);

  const exportData = logs.map((l: any) => ({
    work_date: l.work_date,
    note: l.note ?? '',
    duration_minutes: l.duration_minutes,
    client_name: l.clients?.business_name ?? (l.client_id ? 'Archived client' : ''),
    task_title: l.tasks ? displayTaskName(l.tasks) : (l.task_id ? 'Archived task' : ''),
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Work done"
        subtitle="Track your daily output and time spent on client tasks."
        actions={<ExportButton data={exportData} filename="work-done" format="excel" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <WorkDoneForm clients={clients} tasks={tasks} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <WorkDoneRanges basePath="/team/work-done" params={searchParams ?? {}} />
          <WorkDoneFilters key={JSON.stringify(searchParams ?? {})} clients={clients} tasks={tasks} showStaffFilter={canViewAll} staff={staff} />
          {hasFilter ? (
            <WorkDoneTable
              logs={logs}
              clients={clients}
              tasks={tasks}
              canViewAll={canViewAll}
              canManage={canManageWorkDone}
              currentUserId={me.id}
              userRole="team"
            />
          ) : (
            <div className="tff-card tff-card-pad text-sm text-zinc-500 text-center py-12">
              Choose a date range, client or task and apply filters to see your entries.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
