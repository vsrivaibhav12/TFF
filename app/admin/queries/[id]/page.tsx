import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { getQueryWithMessages } from '@/lib/repositories/queries';

export const dynamic = 'force-dynamic';

export default async function AdminQueryDetail({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  const me = await requireRole('admin');
  await requireCapabilityOrRedirect(me, 'queries.assign');
  const data = await getQueryWithMessages(id);
  if (!data) notFound();
  redirect(`/admin/queries?dock=query:${id}`);
}
