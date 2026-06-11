import { requireRole } from '@/lib/auth/require-role';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { notFound, redirect } from 'next/navigation';
import { getNoticeById } from '@/lib/repositories/notices';

export const dynamic = 'force-dynamic';

export default async function PortalNoticeDetail({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  await requireRole('client');
  const notice = await getNoticeById(id);
  if (!notice) notFound();
  redirect(`/portal/notices?dock=notice:${id}`);
}
