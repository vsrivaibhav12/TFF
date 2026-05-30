-- Performance indexes — 2026-05-20
-- Scope: task list filters, task detail tabs, client lookups

-- Task list hot paths (every /team/tasks and /admin/tasks load)
CREATE INDEX IF NOT EXISTS idx_tasks_client_status_deleted ON tasks(client_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assigned_to, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON tasks(due_date, status) WHERE is_deleted = false AND status != 'completed';
CREATE INDEX IF NOT EXISTS idx_tasks_subservice ON tasks(sub_service_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_reviewer ON tasks(reviewer_id, status) WHERE is_deleted = false;

-- Task detail tabs
CREATE INDEX IF NOT EXISTS idx_task_activity_task_created ON task_activity(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_notes_task_created ON task_notes(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_steps_task_order ON task_steps(task_id, step_order);

-- Client lookups (client_sub_services has no is_deleted column)
CREATE INDEX IF NOT EXISTS idx_client_sub_services_client ON client_sub_services(client_id, is_active);
