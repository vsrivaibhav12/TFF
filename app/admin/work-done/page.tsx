import { requireRole } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import { listWorkDone } from '@/lib/repositories/work-done';
import { listAccessibleClients, listTeamUsers } from '@/lib/repositories/clients';
import { listTasks } from '@/lib/repositories/tasks';
import { PageHeader } from '@/components/ui/page-header';
import { FullExport } from '@/components/reports/full-export';
import WorkDoneForm from '@/app/team/work-done/work-done-form';
import WorkDoneFilters from '@/components/operations/work-done-filters';
import WorkDoneRanges from '@/components/operations/work-done-ranges';
import WorkDoneTable from '@/components/operations/work-done-table';

export const dynamic = 'force-dynamic';

export default async function AdminWorkDonePage({ searchParams }: { searchParams?: { from?: string; to?: string; q?: string; client?: string; task?: string; user?: string } }) {
  const me = await requireRole('admin');
  const canManageWorkDone = await hasCapability(me, 'workdone.manage');

  const listOpts: Parameters<typeof listWorkDone>[0] = {};
  if (searchParams?.from) listOpts.startDate = searchParams.from;
  if (searchParams?.to) listOpts.endDate = searchParams.to;
  if (searchParams?.q) listOpts.search = searchParams.q;
  if (searchParams?.client) listOpts.clientId = searchParams.client;
  if (searchParams?.task) listOpts.taskId = searchParams.task;
  if (searchParams?.user) listOpts.userId = searchParams.user;

  // Entries load only once a filter is applied, so opening the page stays fast.
  const hasFilter = Boolean(searchParams?.from || searchParams?.to || searchParams?.q || searchParams?.client || searchParams?.task || searchParams?.user);

  const [logs, clients, tasks, staff] = await Promise.all([
    hasFilter ? listWorkDone(listOpts) : Promise.resolve([]),
    listAccessibleClients(),
    listTasks({ status: ['pending', 'in_progress'] }),
    listTeamUsers(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Work done"
        subtitle="Track daily output and time spent on client tasks across the firm."
        actions={<FullExport source={{ kind: 'work-done', filters: { from: searchParams?.from, to: searchParams?.to, q: searchParams?.q, client: searchParams?.client, task: searchParams?.task, user: searchParams?.user } }} label="work done entries" filename="work-done" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <WorkDoneForm clients={clients} tasks={tasks} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <WorkDoneRanges basePath="/admin/work-done" params={searchParams ?? {}} />
          <WorkDoneFilters key={JSON.stringify(searchParams ?? {})} clients={clients} tasks={tasks} showStaffFilter staff={staff} />
          {hasFilter ? (
            <WorkDoneTable
              logs={logs}
              clients={clients}
              tasks={tasks}
              canViewAll
              canManage={canManageWorkDone}
              currentUserId={me.id}
              userRole="admin"
            />
          ) : (
            <div className="tff-card tff-card-pad text-sm text-slate-500 text-center py-12">
              Choose a date range, client, task or staff member and apply filters to see entries.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
