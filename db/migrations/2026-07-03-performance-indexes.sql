-- Performance index migration — Phase 1
-- Date: 2026-07-03
-- All indexes are additive (IF NOT EXISTS) and safe to roll back by name if needed.

-- Enable trigram extension for fast ILIKE / prefix-agnostic text search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- tasks — the hottest table in the portal
-- ============================================================================

-- Common list filters: assigned user + status + due date (overdue/due soon views).
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status_due
  ON tasks (assigned_to, status, due_date)
  WHERE is_deleted = false;

-- Client detail / client-scoped task lists.
CREATE INDEX IF NOT EXISTS idx_tasks_client_subservice_status
  ON tasks (client_id, sub_service_id, status)
  WHERE is_deleted = false;

-- Period-driven filters (monthly/quarterly filing tasks).
CREATE INDEX IF NOT EXISTS idx_tasks_period_status
  ON tasks (period_year, period_month, status)
  WHERE is_deleted = false;

-- Manager views: stuck/high-priority triage.
CREATE INDEX IF NOT EXISTS idx_tasks_stuck_priority_status
  ON tasks (is_stuck, priority, status)
  WHERE is_deleted = false;

-- Billable / verified filters.
CREATE INDEX IF NOT EXISTS idx_tasks_billable_verified
  ON tasks (is_billable, is_verified, status)
  WHERE is_deleted = false;

-- Due-date ordering for dashboard widgets and overdue queries.
CREATE INDEX IF NOT EXISTS idx_tasks_due_date
  ON tasks (due_date)
  WHERE is_deleted = false;

-- Recently updated / completed tasks for closure velocity and audit widgets.
CREATE INDEX IF NOT EXISTS idx_tasks_status_updated
  ON tasks (status, updated_at DESC)
  WHERE is_deleted = false;

-- ============================================================================
-- clients — search and roster filters
-- ============================================================================

-- Common roster filters by group and city.
CREATE INDEX IF NOT EXISTS idx_clients_group_city
  ON clients (group_id, city)
  WHERE is_deleted = false;

-- Fast name / PAN search used by client pickers and roster search.
CREATE INDEX IF NOT EXISTS idx_clients_search_trgm
  ON clients USING gin (business_name gin_trgm_ops, pan gin_trgm_ops)
  WHERE is_deleted = false;

-- ============================================================================
-- capability resolution — cached per-request, but first fetch must be fast
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_staff_capabilities_user_cap
  ON staff_capabilities (user_id, capability)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_role_template_capabilities_template_cap
  ON staff_role_template_capabilities (template_id, capability);

-- ============================================================================
-- task enrichment tables
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_task_steps_task_id
  ON task_steps (task_id);

CREATE INDEX IF NOT EXISTS idx_task_label_assignments_task_id
  ON task_label_assignments (task_id);

CREATE INDEX IF NOT EXISTS idx_task_label_assignments_label_task
  ON task_label_assignments (label_code, task_id);

-- ============================================================================
-- client-service links and compliance lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_client_sub_services_client
  ON client_sub_services (client_id)
  WHERE is_active = true;

-- Add a covering index for compliance status rollups if the table exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gst_filings') THEN
    CREATE INDEX IF NOT EXISTS idx_gst_filings_client_period
      ON gst_filings (client_id, period_year, period_month);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tds_filings') THEN
    CREATE INDEX IF NOT EXISTS idx_tds_filings_client_period
      ON tds_filings (client_id, period_year, period_quarter);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'income_tax_filings') THEN
    CREATE INDEX IF NOT EXISTS idx_it_filings_client_period
      ON income_tax_filings (client_id, assessment_year);
  END IF;
END
$$;

-- ============================================================================
-- Audit / activity feeds
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_global_audit_log_performed_at
  ON global_audit_log (performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_global_audit_log_actor_action
  ON global_audit_log (performed_by, action, performed_at DESC);
