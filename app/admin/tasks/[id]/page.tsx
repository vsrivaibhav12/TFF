import { requireRole } from '@/lib/auth/require-role';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { notFound, redirect } from 'next/navigation';
import { getTask } from '@/lib/repositories/tasks';

export const dynamic = 'force-dynamic';

export default async function AdminTaskDetail({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  await requireRole('admin');
  const task = await getTask(id);
  if (!task) notFound();
  redirect(`/admin/tasks?dock=task:${id}`);
}
