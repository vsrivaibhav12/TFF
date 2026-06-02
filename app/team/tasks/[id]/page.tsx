import { notFound } from 'next/navigation';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
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
import { requireRole } from '@/lib/auth/require-role';
import { listGrantedCapabilities } from '@/lib/repositories/staff-capabilities';
import TaskDetailShell from '@/components/tasks/task-detail-shell';

export const dynamic = 'force-dynamic';

export default async function TeamTaskDetail({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  const me = await requireRole(['admin', 'team']);
  const capabilities = me.role === 'admin' ? [] : await listGrantedCapabilities(me.id);
  const capSet = new Set(capabilities);
  const canEditSteps = me.role === 'admin' || capSet.has('tasks.complete');

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
      canEditSteps={canEditSteps}
      basePath="/team/tasks"
      clientPath={`/team/clients/${(task as any).client_id}`}
    />
  );
}
