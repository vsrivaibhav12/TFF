import { requireRole } from '@/lib/auth/require-role';
import { notFound, redirect } from 'next/navigation';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { getQueryWithMessages } from '@/lib/repositories/queries';

export const dynamic = 'force-dynamic';

export default async function TeamQueryDetail({ params }: { params: { id: string } }) {
  await requireRole(['admin', 'team']);
  const { id } = parseParams(params, IdParamSchema);
  const data = await getQueryWithMessages(id);
  if (!data) notFound();
  redirect(`/team/queries?dock=query:${id}`);
}
