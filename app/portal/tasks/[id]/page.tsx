import { notFound, redirect } from 'next/navigation';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { getTask } from '@/lib/repositories/tasks';
import { requireRole } from '@/lib/auth/require-role';

export const dynamic = 'force-dynamic';

export default async function PortalTaskDetail({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  await requireRole('client');
  const task = await getTask(id);
  if (!task) notFound();
  redirect(`/portal/tasks?dock=task:${id}`);
}
