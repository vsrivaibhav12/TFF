import { notFound, redirect } from 'next/navigation';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { getQueryWithMessages } from '@/lib/repositories/queries';
import { requireRole } from '@/lib/auth/require-role';

export const dynamic = 'force-dynamic';

export default async function PortalQueryDetail({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  await requireRole('client');
  const data = await getQueryWithMessages(id);
  if (!data) notFound();
  redirect(`/portal/queries?dock=query:${id}`);
}
