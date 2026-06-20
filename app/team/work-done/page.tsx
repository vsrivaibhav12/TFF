import { requireRole } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import { listWorkDone } from '@/lib/repositories/work-done';
import { listAccessibleClients, listTeamUsers } from '@/lib/repositories/clients';
import { listTasks } from '@/lib/repositories/tasks';
import WorkDoneForm from './work-done-form';
import WorkDoneFilters from '@/components/operations/work-done-filters';
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

  const [logs, clients, tasks, staff] = await Promise.all([
    listWorkDone(listOpts),
    listAccessibleClients(),
    listTasks(canViewAll ? { status: ['pending', 'in_progress'] } : { assignedTo: me.id, status: ['pending', 'in_progress'] }),
    canViewAll ? listTeamUsers() : Promise.resolve([]),
  ]);

  const totalMinutes = logs.reduce((acc, l) => acc + l.duration_minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const exportData = logs.map((l: any) => ({
    work_date: l.work_date,
    note: l.note ?? '',
    duration_minutes: l.duration_minutes,
    client_name: l.clients?.business_name ?? (l.client_id ? 'Archived client' : ''),
    task_title: l.tasks ? displayTaskName(l.tasks) : (l.task_id ? 'Archived task' : ''),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work done"
        subtitle="Track your daily output and time spent on client tasks."
        actions={<ExportButton data={exportData} filename="work-done" format="excel" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <WorkDoneForm clients={clients} tasks={tasks} />
          
          <div className="tff-card tff-card-pad bg-zinc-50">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total logged</div>
            <div className="mt-2 text-4xl font-bold text-zinc-900">{totalHours}h</div>
            <div className="text-sm text-zinc-500 mt-1">across {logs.length} entries</div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <WorkDoneFilters clients={clients} tasks={tasks} showStaffFilter={canViewAll} staff={staff} />
          <WorkDoneTable
            logs={logs}
            clients={clients}
            tasks={tasks}
            canViewAll={canViewAll}
            canManage={canManageWorkDone}
            currentUserId={me.id}
            role="team"
          />
        </div>
      </div>
    </div>
  );
}
