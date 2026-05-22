import { requireRole } from '@/lib/auth/require-role';
import { listWorkDone } from '@/lib/repositories/work-done';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listTasks } from '@/lib/repositories/tasks';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import WorkDoneForm from '@/app/team/work-done/work-done-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminWorkDonePage() {
  await requireRole('admin');
  const [logs, clients, tasks] = await Promise.all([
    listWorkDone({}),
    listAccessibleClients(),
    listTasks({ status: ['pending', 'in_progress'] }),
  ]);

  const totalMinutes = logs.reduce((acc, l) => acc + l.duration_minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const exportData = (logs ?? []).map((l: any) => ({
    date: l.work_date,
    staff: l.users_profile?.full_name ?? '—',
    activity: l.note ?? '',
    duration_minutes: l.duration_minutes,
    client: l.clients?.business_name ?? '',
    task: l.tasks?.title ?? '',
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

        <div className="lg:col-span-2">
          <div className="tff-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Context</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{formatDateIST(l.work_date)}</TableCell>
                    <TableCell className="text-sm text-zinc-600">{l.users_profile?.full_name ?? '—'}</TableCell>
                    <TableCell>
                      <div className="max-w-[300px] truncate" title={l.note ?? ''}>{l.note ?? '—'}</div>
                    </TableCell>
                    <TableCell>{l.duration_minutes}m</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {l.clients?.business_name && (
                          <span className="text-[10px] text-zinc-500 uppercase">{l.clients.business_name}</span>
                        )}
                        {l.tasks?.title && (
                          <Badge variant="outline" className="text-[10px] py-0">{l.tasks.title}</Badge>
                        )}
                        {!l.clients && !l.tasks && <span className="text-zinc-400">—</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                      No work logged yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
