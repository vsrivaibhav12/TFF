import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listClientGroups } from '@/lib/repositories/clients';
import { ClientCreateForm } from '../../../clients/new/client-create-form';
import ModalWrapper from '@/components/shell/modal-wrapper';

export const dynamic = 'force-dynamic';

export default async function NewClientModalIntercept() {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'clients.create');
  const groups = await listClientGroups();
  
  return (
    <ModalWrapper>
      <div className="pt-8 px-4 sm:px-8 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="mb-6">
          <h1 className="tff-page-title text-2xl font-bold">New client</h1>
          <p className="tff-page-subtitle text-zinc-500">Most fields are optional. Only Business name is required.</p>
        </div>
        <ClientCreateForm groups={groups as any} />
      </div>
    </ModalWrapper>
  );
}
