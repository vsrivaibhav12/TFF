import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { notFound, redirect } from 'next/navigation';
import { getNoticeById } from '@/lib/repositories/notices';

export const dynamic = 'force-dynamic';

export default async function AdminNoticeDetail({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'notices.manage');
  const notice = await getNoticeById(id);
  if (!notice) notFound();
  redirect(`/admin/notices?dock=notice:${id}`);
}
