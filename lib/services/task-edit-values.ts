// Pure helper: the task fields the edit form can change, normalised so they compare cleanly.

export type TaskEditValues = {
  sub_service_id: string | null;
  task_template_id: string | null;
  period_year: number | null;
  period_month: number | null;
  period_quarter: number | null;
  is_billable: boolean;
  bill_reference: string | null;
  bill_amount: number | null;
  arn_reference: string | null;
  is_arn_client_visible: boolean;
  description: string | null;
  priority: string;
  due_date: string | null;
};

interface TaskLike {
  sub_service_id?: string | null;
  task_template_id?: string | null;
  period_year?: number | null;
  period_month?: number | null;
  period_quarter?: number | null;
  is_billable?: boolean | null;
  bill_reference?: string | null;
  bill_amount?: number | null;
  arn_reference?: string | null;
  is_arn_client_visible?: boolean | null;
  description?: string | null;
  priority: string;
  due_date?: string | null;
}

/** Snapshot of the editable values of a task. The form diffs against the snapshot taken when it opened. */
export function taskToEditValues(task: TaskLike): TaskEditValues {
  return {
    sub_service_id: task.sub_service_id ?? null,
    task_template_id: task.task_template_id ?? null,
    period_year: task.period_year ?? null,
    period_month: task.period_month ?? null,
    period_quarter: task.period_quarter ?? null,
    is_billable: task.is_billable ?? false,
    bill_reference: task.bill_reference ?? null,
    bill_amount: task.bill_amount ?? null,
    arn_reference: task.arn_reference ?? null,
    is_arn_client_visible: task.is_arn_client_visible ?? false,
    description: task.description ?? null,
    priority: task.priority,
    due_date: task.due_date ? task.due_date.slice(0, 10) : null,
  };
}
