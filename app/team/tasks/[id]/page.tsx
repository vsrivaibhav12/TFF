import { requireRole } from '@/lib/auth/require-role';
import { notFound, redirect } from 'next/navigation';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { getTask } from '@/lib/repositories/tasks';

export const dynamic = 'force-dynamic';

export default async function TeamTaskDetail({ params }: { params: { id: string } }) {
  await requireRole(['admin', 'team']);
  const { id } = parseParams(params, IdParamSchema);
  const task = await getTask(id);
  if (!task) notFound();
  redirect(`/team/tasks?dock=task:${id}`);
}
