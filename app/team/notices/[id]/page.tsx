import { requireRole } from '@/lib/auth/require-role';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { notFound, redirect } from 'next/navigation';
import { getNoticeById } from '@/lib/repositories/notices';

export const dynamic = 'force-dynamic';

export default async function TeamNoticeDetail({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  await requireRole(['admin', 'team']);
  const notice = await getNoticeById(id);
  if (!notice) notFound();
  redirect(`/team/notices?dock=notice:${id}`);
}
