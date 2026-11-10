-- ============================================================================
-- Performance index additions — 2026-07-01
-- Targets hot paths causing 5-10s page loads.
-- Idempotent (CREATE INDEX IF NOT EXISTS).
-- Run via: npx tsx scripts/apply-migration.ts db/migrations/2026-07-01-performance-indexes.sql
-- ============================================================================

-- Tax projections N+1: getLatestProjection queries by client + type + year
CREATE INDEX IF NOT EXISTS idx_compliance_insights_lookup
  ON public.compliance_insights(client_id, insight_type, period_year, created_at DESC);

-- Notices list + client filter
CREATE INDEX IF NOT EXISTS idx_notices_client_status
  ON public.notices(client_id, status) WHERE is_deleted = false;

-- Task label filtering and joins
CREATE INDEX IF NOT EXISTS idx_task_label_assignments_task
  ON public.task_label_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_label_assignments_label
  ON public.task_label_assignments(label_code);

-- Audit log entity lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.global_audit_log(entity_type, entity_id, performed_at DESC);

-- Portal query list
CREATE INDEX IF NOT EXISTS idx_queries_created_by_status
  ON public.queries(created_by, status) WHERE is_deleted = false;

-- DSC expiry radar
CREATE INDEX IF NOT EXISTS idx_dsc_records_expiry_status
  ON public.dsc_records(expiry_date, status) WHERE is_deleted = false;

-- Client lookup by name/PAN for search
CREATE INDEX IF NOT EXISTS idx_clients_business_name
  ON public.clients(business_name text_pattern_ops);

-- Task search by title/number
CREATE INDEX IF NOT EXISTS idx_tasks_title
  ON public.tasks(title text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_tasks_task_number
  ON public.tasks(task_number text_pattern_ops);

-- Compliance calendar date range queries
CREATE INDEX IF NOT EXISTS idx_compliance_events_due_date
  ON public.compliance_calendar_events(due_date, status) WHERE is_deleted = false;

-- Work done task lookups
CREATE INDEX IF NOT EXISTS idx_task_workdone_task_id
  ON public.task_workdone(task_id, work_date DESC);

-- Task activity lookups
CREATE INDEX IF NOT EXISTS idx_task_activity_task_id
  ON public.task_activity(task_id, created_at DESC);

ANALYZE public.clients;
ANALYZE public.tasks;
ANALYZE public.compliance_insights;
ANALYZE public.notices;
ANALYZE public.global_audit_log;
