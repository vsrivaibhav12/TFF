import { requireRole } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import { listWorkDone } from '@/lib/repositories/work-done';
import { listAccessibleClients, listTeamUsers } from '@/lib/repositories/clients';
import { listTasks } from '@/lib/repositories/tasks';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import WorkDoneForm from '@/app/team/work-done/work-done-form';
import WorkDoneFilters from '@/components/operations/work-done-filters';
import WorkDoneTable from '@/components/operations/work-done-table';
import { displayTaskName } from '@/lib/utils';

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

  const [logs, clients, tasks, staff] = await Promise.all([
    listWorkDone(listOpts),
    listAccessibleClients(),
    listTasks({ status: ['pending', 'in_progress'] }),
    listTeamUsers(),
  ]);

  const totalMinutes = logs.reduce((acc, l) => acc + l.duration_minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const exportData = (logs ?? []).map((l: any) => ({
    date: l.work_date,
    staff: l.users_profile?.full_name ?? '—',
    activity: l.note ?? '',
    duration_minutes: l.duration_minutes,
    client: l.clients?.business_name ?? (l.client_id ? 'Archived client' : ''),
    task: l.tasks ? displayTaskName(l.tasks) : (l.task_id ? 'Archived task' : ''),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work done"
        subtitle="Track daily output and time spent on client tasks across the firm."
        actions={<ExportButton data={exportData} filename="work-done-export" format="csv" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <WorkDoneForm clients={clients} tasks={tasks} />
          
          <div className="p-6 tff-card">
            <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Total logged (firm)</div>
            <div className="mt-2 text-4xl font-bold text-zinc-900">{totalHours}h</div>
            <div className="text-sm text-zinc-500 mt-1">across {logs.length} entries</div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <WorkDoneFilters clients={clients} tasks={tasks} showStaffFilter staff={staff} />
          <WorkDoneTable
            logs={logs}
            clients={clients}
            tasks={tasks}
            canViewAll
            canManage={canManageWorkDone}
            currentUserId={me.id}
            role="admin"
          />
        </div>
      </div>
    </div>
  );
}
