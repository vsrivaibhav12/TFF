import { requireRole } from '@/lib/auth/require-role';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { notFound, redirect } from 'next/navigation';
import { getTask } from '@/lib/repositories/tasks';


export default async function TaskDetail({ params }: { params: { id: string } }, rolePrefix: string) {
  const { id } = parseParams(params, IdParamSchema);
  await requireRole(['admin', 'team']);
  const task = await getTask(id);
  if (!task) notFound();
  redirect(`${rolePrefix}/tasks?dock=task:${id}`);
}
