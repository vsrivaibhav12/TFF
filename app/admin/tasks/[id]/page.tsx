import { requireRole } from '@/lib/auth/require-role';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { notFound } from 'next/navigation';
import { getTask, listTaskActivity, listTaskNotes } from '@/lib/repositories/tasks';
import { listTeamUsers } from '@/lib/repositories/clients';
import { listTaskSteps } from '@/lib/repositories/task-steps';
import {
  listDefinitionsForSubService,
  listValuesForTask,
  listLabels,
  listLabelsForTask,
} from '@/lib/repositories/task-custom-fields';
import { listWorkDoneForTask } from '@/lib/repositories/workdone';
import TaskDetailShell from '@/components/tasks/task-detail-shell';

export const dynamic = 'force-dynamic';

export default async function AdminTaskDetail({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'tasks.create');

  const task = await getTask(id);
  if (!task) notFound();

  const [activity, notes, team, steps, cfDefs, cfValues, allLabels, assignedLabels, workdone] = await Promise.all([
    listTaskActivity(id),
    listTaskNotes(id),
    listTeamUsers(),
    listTaskSteps(id),
    (task as any).sub_service_id ? listDefinitionsForSubService((task as any).sub_service_id) : Promise.resolve([]),
    listValuesForTask(id),
    listLabels(),
    listLabelsForTask(id),
    listWorkDoneForTask(id),
  ]);

  return (
    <TaskDetailShell
      task={task}
      activity={activity as any}
      notes={notes as any}
      team={team as any}
      steps={steps as any}
      cfDefs={cfDefs as any}
      cfValues={cfValues as any}
      allLabels={allLabels as any}
      assignedLabels={assignedLabels as any}
      workdone={workdone as any}
      currentUserId={me.id}
      canEditSteps={true}
      basePath="/admin/tasks"
      clientPath={`/admin/clients/${(task as any).client_id}`}
    />
  );
}
