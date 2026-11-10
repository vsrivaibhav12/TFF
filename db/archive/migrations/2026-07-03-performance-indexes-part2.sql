-- Performance index migration — Phase 2 (additional indexes)
-- Date: 2026-07-03
-- All indexes are additive (IF NOT EXISTS) and safe to roll back by name.

-- Trigram search for task title / number and sub-service names.
CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm
  ON tasks USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tasks_task_number_trgm
  ON tasks USING gin (task_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_sub_services_name_trgm
  ON sub_services USING gin (name gin_trgm_ops);

-- Attention / manager triage on tasks.
CREATE INDEX IF NOT EXISTS idx_tasks_attention
  ON tasks (status, is_stuck)
  WHERE is_deleted = false;

-- Workdone reporting hot paths.
CREATE INDEX IF NOT EXISTS idx_task_workdone_work_date
  ON task_workdone (work_date DESC);

CREATE INDEX IF NOT EXISTS idx_task_workdone_client_date
  ON task_workdone (client_id, work_date);

-- Notices / queries dashboards and docks.
CREATE INDEX IF NOT EXISTS idx_notices_due_date_open
  ON notices (due_date)
  WHERE is_deleted = false AND status != 'closed';

CREATE INDEX IF NOT EXISTS idx_notices_assigned_status
  ON notices (assigned_to, status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_queries_status_created
  ON queries (status, created_at DESC)
  WHERE is_deleted = false;

-- Compliance dashboard grouping.
CREATE INDEX IF NOT EXISTS idx_compliance_events_rule_period
  ON compliance_calendar_events (rule_code, period_label, task_id);

-- RLS helper indexes for team/client scoping.
CREATE INDEX IF NOT EXISTS idx_team_client_assignment_user_client
  ON team_client_assignment (team_user_id, client_id);

CREATE INDEX IF NOT EXISTS idx_client_users_user_active_client
  ON client_users (user_id, client_id, is_active)
  WHERE is_active = true;

-- User lookup helpers for auth / role gating.
CREATE INDEX IF NOT EXISTS idx_users_profile_role_active
  ON users_profile (role, is_active, is_deleted)
  WHERE is_deleted = false;
