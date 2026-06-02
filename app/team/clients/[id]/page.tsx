import { notFound } from 'next/navigation';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { getClientById } from '@/lib/repositories/clients';
import { listClientSubServices } from '@/lib/repositories/services';
import { listTasks, enrichTasksWithProgress } from '@/lib/repositories/tasks';
import { listAllNotices } from '@/lib/repositories/notices';
import { listQueries } from '@/lib/repositories/queries';
import { listEntityAuditLogs } from '@/lib/repositories/audit';
import { getCurrentUser } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import TeamClientDetailShell from '@/components/clients/team-client-detail-shell';

export const dynamic = 'force-dynamic';

export default async function TeamClientDetail({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  const me = await getCurrentUser();
  const canEdit = me ? await hasCapability(me, 'clients.edit') : false;
  const client = await getClientById(params.id);
  if (!client) notFound();

  const [subs, rawTasks, notices, queries, auditLogs] = await Promise.all([
    listClientSubServices(params.id),
    listTasks({ clientId: params.id, limit: 20 }),
    listAllNotices({ clientId: params.id }),
    listQueries({ clientId: params.id }),
    listEntityAuditLogs('client', params.id),
  ]);

  const tasks = await enrichTasksWithProgress(rawTasks);

  const openTasks = tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled');
  const openNotices = notices.filter((n: any) => n.status !== 'resolved' && n.status !== 'closed');
  const openQueries = queries.filter((q: any) => q.status !== 'resolved' && q.status !== 'closed');

  return (
    <TeamClientDetailShell
      client={client}
      subs={subs}
      auditLogs={auditLogs}
      openTasks={openTasks}
      openNotices={openNotices}
      openQueries={openQueries}
      canEdit={canEdit}
      basePath="/team/clients"
    />
  );
}
