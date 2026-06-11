import { requireRole } from '@/lib/auth/require-role';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { requireCapabilityOrRedirect, hasCapability } from '@/lib/auth/require-capability';
import { notFound, redirect } from 'next/navigation';
import { getClientById } from '@/lib/repositories/clients';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
  rolePrefix: string;
}

export default async function ClientDetailPage({ params, rolePrefix }: Props) {
  const { id } = parseParams(params, IdParamSchema);
  const me = await requireRole(['admin', 'team']);
  const canReadAll = await hasCapability(me, 'clients.read.all');
  const canEdit = await hasCapability(me, 'clients.edit');
  if (!canReadAll && !canEdit) {
    await requireCapabilityOrRedirect(me, 'clients.read.all');
  }
  const client = await getClientById(id);
  if (!client) notFound();

  // Redirect to list view with dock auto-opened
  redirect(`${rolePrefix}/clients?dock=client:${id}`);
  return null;
}
