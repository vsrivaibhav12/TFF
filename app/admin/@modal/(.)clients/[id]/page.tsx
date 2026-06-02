import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect, hasCapability } from '@/lib/auth/require-capability';
import { notFound } from 'next/navigation';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { getClientById, listClientUsers, listTeamAssignments, listTeamUsers, listClientGroups } from '@/lib/repositories/clients';
import { listClientServices, listClientSubServices } from '@/lib/repositories/services';
import { listEntityAuditLogs } from '@/lib/repositories/audit';
import { listTasks, enrichTasksWithProgress } from '@/lib/repositories/tasks';
import { listAllNotices } from '@/lib/repositories/notices';
import { listQueries } from '@/lib/repositories/queries';
import ClientDetailShell from '@/components/clients/client-detail-shell';
import ModalWrapper from '@/components/shell/modal-wrapper';

export const dynamic = 'force-dynamic';

export default async function AdminClientModalIntercept({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  const me = await requireRole(['admin', 'team']);
  const canReadAll = await hasCapability(me, 'clients.read.all');
  const canEdit = await hasCapability(me, 'clients.edit');
  if (!canReadAll && !canEdit) {
    await requireCapabilityOrRedirect(me, 'clients.read.all');
  }
  const client = await getClientById(id);
  if (!client) notFound();

  const [groups, owners, clientServices, clientSubServices, clientUsers, teamAssignments, auditLogs, rawTasks, notices, queries] = await Promise.all([
    listClientGroups(),
    listTeamUsers(),
    listClientServices(id),
    listClientSubServices(id),
    listClientUsers(id),
    listTeamAssignments(id),
    listEntityAuditLogs('client', id),
    listTasks({ clientId: id, limit: 20 }),
    listAllNotices({ clientId: id }),
    listQueries({ clientId: id }),
  ]);

  const tasks = await enrichTasksWithProgress(rawTasks);

  const openTasks = tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled');
  const openNotices = notices.filter((n: any) => n.status !== 'resolved' && n.status !== 'closed');
  const openQueries = queries.filter((q: any) => q.status !== 'resolved' && q.status !== 'closed');

  return (
    <ModalWrapper>
      <div className="pt-8 px-2 md:px-4 h-full">
        <ClientDetailShell
          client={client}
          groups={groups}
          owners={owners}
          clientServices={clientServices}
          clientSubServices={clientSubServices}
          clientUsers={clientUsers}
          teamAssignments={teamAssignments}
          auditLogs={auditLogs}
          openTasks={openTasks}
          openNotices={openNotices}
          openQueries={openQueries}
          basePath="/admin/clients"
          isModal={true}
        />
      </div>
    </ModalWrapper>
  );
}
