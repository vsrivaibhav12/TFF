import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { requireRole } from '@/lib/auth/require-role';
import { listClientGroups } from '@/lib/repositories/clients';
import { Users } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import ClientGroupsClient from '../../../clients/groups/client-groups-client';
import ModalWrapper from '@/components/shell/modal-wrapper';

export const dynamic = 'force-dynamic';

export default async function ClientGroupsModalIntercept() {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'clients.read.all');
  const groups = await listClientGroups();

  return (
    <ModalWrapper>
      <div className="pt-8 px-4 sm:px-8 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="mb-6">
          <h1 className="tff-page-title text-2xl font-bold">Client groups</h1>
          <p className="tff-page-subtitle text-zinc-500">Organise clients into segments for reporting and filtering.</p>
        </div>

        {groups.length === 0 ? (
          <EmptyState
            title="No groups yet"
            body="Create groups like 'Premium', 'Startups', or 'Manufacturing' to segment your client base."
            icon={<Users className="h-6 w-6 text-zinc-400" />}
          />
        ) : (
          <ClientGroupsClient groups={groups as any} />
        )}
      </div>
    </ModalWrapper>
  );
}
