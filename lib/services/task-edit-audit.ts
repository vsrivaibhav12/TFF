import { writeAudit } from '@/lib/services/audit-service';

/** Record an edit made to a completed task. Does nothing for tasks that are still open. */
export async function auditClosedTaskEdit(args: {
  task: { id: string; status: string };
  performedBy: string;
  fields: Record<string, unknown>;
}): Promise<void> {
  if (args.task.status !== 'completed') return;
  await writeAudit({
    action: 'task.update_closed',
    entity_type: 'task',
    entity_id: args.task.id,
    performed_by: args.performedBy,
    details: { fields: args.fields },
  });
}
