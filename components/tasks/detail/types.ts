export interface Task {
  id: string;
  task_number?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  due_date?: string | null;
  period_year?: number | null;
  period_month?: number | null;
  period_quarter?: number | null;
  assigned_to?: string | null;
  reviewer_id?: string | null;
  client_id: string;
  sub_service_id?: string | null;
  task_template_id?: string | null;
  is_billable?: boolean;
  bill_reference?: string | null;
  bill_amount?: number | null;
  arn_reference?: string | null;
  is_arn_client_visible?: boolean;
  is_blocked_on_client?: boolean;
  is_stuck?: boolean;
  stuck_reason_code?: string | null;
  stuck_reason_note?: string | null;
  is_verified?: boolean;
  verification_note?: string | null;
  created_date?: string | null;
  completed_date?: string | null;
  assignees?: { id: string; full_name: string }[];
  reviewers?: { id: string; full_name: string }[];
  assignee?: { id: string; full_name: string } | null;
  reviewer?: { id: string; full_name: string } | null;
  sub_services?: { name: string; services?: { name?: string | null } | null } | null;
  clients?: { business_name?: string | null } | null;
}

export interface Activity {
  id: string;
  action: string;
  created_at: string;
  field_name?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  users_profile?: { full_name?: string | null } | null;
}

export interface Note {
  id: string;
  note_text: string;
  created_at: string;
  users_profile?: { full_name?: string | null } | null;
}

export interface TeamMember {
  id: string;
  full_name: string;
}


export interface SubService {
  sub_service_id: string;
  sub_services?: { name?: string | null; services?: { name?: string | null } | null } | null;
}

export interface TaskTemplate {
  id: string;
  sub_service_id: string;
  title: string;
}

export interface Props {
  task: Task;
  activity: Activity[];
  notes: Note[];
  team: TeamMember[];
  steps: import('@/components/tasks/task-steps-panel').Step[];
  cfDefs: import('@/lib/repositories/task-custom-fields').CustomFieldDefinition[];
  cfValues: import('@/lib/repositories/task-custom-fields').CustomFieldValue[];
  allLabels: import('@/lib/repositories/task-custom-fields').TaskLabel[];
  assignedLabels: string[];
  workdone: import('@/lib/repositories/work-done').WorkDoneRow[];
  subServices: SubService[];
  taskTemplates: TaskTemplate[];
  currentUserId: string;
  canEdit: boolean;
  canEditSteps: boolean;
  canDelete: boolean;
  basePath: string;
  clientPath: string;
  isModal?: boolean;
  onRefresh?: () => void;
}
