-- Performance indices for tasks table
-- Created: 2026-05-13

CREATE INDEX IF NOT EXISTS idx_tasks_client_status ON tasks(client_id, status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status_due ON tasks(assigned_to, status, due_date)
  WHERE is_deleted = false;
