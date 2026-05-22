-- Unified work items view for the Work Hub
-- Merges tasks, notices, queries, and compliance_calendar_events into a single stream

CREATE OR REPLACE VIEW all_work_items AS

-- Tasks (most common work item)
SELECT
  t.id,
  'task' AS source_type,
  t.task_number AS reference_number,
  t.title,
  t.status,
  t.priority,
  t.due_date,
  t.created_at,
  t.updated_at,
  t.assigned_to,
  t.reviewer_id,
  t.client_id,
  c.business_name AS client_name,
  t.is_blocked_on_client AS is_blocked,
  t.is_stuck,
  t.stuck_reason_code,
  t.verification_status,
  t.is_verified,
  NULL::uuid AS rule_id,
  NULL::text AS period_label,
  NULL::text AS service_kind,
  NULL::numeric AS amount_involved,
  t.sub_service_id,
  ss.name AS sub_service_name,
  s.name AS service_name
FROM tasks t
LEFT JOIN clients c ON c.id = t.client_id
LEFT JOIN sub_services ss ON ss.id = t.sub_service_id
LEFT JOIN services s ON s.id = ss.service_id
WHERE t.is_deleted = false

UNION ALL

-- Notices
SELECT
  n.id,
  'notice' AS source_type,
  n.notice_number AS reference_number,
  COALESCE(n.subject, n.notice_type::text) AS title,
  n.status,
  'high' AS priority,
  n.due_date,
  n.notice_received_date AS created_at,
  n.updated_at,
  n.assigned_to,
  NULL::uuid AS reviewer_id,
  n.client_id,
  c.business_name AS client_name,
  false AS is_blocked,
  false AS is_stuck,
  NULL::text AS stuck_reason_code,
  NULL::text AS verification_status,
  false AS is_verified,
  NULL::uuid AS rule_id,
  NULL::text AS period_label,
  NULL::text AS service_kind,
  n.amount_involved,
  NULL::uuid AS sub_service_id,
  NULL::text AS sub_service_name,
  NULL::text AS service_name
FROM notices n
LEFT JOIN clients c ON c.id = n.client_id
WHERE n.is_deleted = false

UNION ALL

-- Queries
SELECT
  q.id,
  'query' AS source_type,
  q.query_number AS reference_number,
  q.subject AS title,
  q.status,
  q.priority,
  NULL::date AS due_date,
  q.created_at,
  q.updated_at,
  q.raised_by AS assigned_to,
  NULL::uuid AS reviewer_id,
  q.client_id,
  c.business_name AS client_name,
  false AS is_blocked,
  false AS is_stuck,
  NULL::text AS stuck_reason_code,
  NULL::text AS verification_status,
  false AS is_verified,
  NULL::uuid AS rule_id,
  NULL::text AS period_label,
  NULL::text AS service_kind,
  NULL::numeric AS amount_involved,
  NULL::uuid AS sub_service_id,
  NULL::text AS sub_service_name,
  NULL::text AS service_name
FROM queries q
LEFT JOIN clients c ON c.id = q.client_id
WHERE q.is_deleted = false

UNION ALL

-- Compliance calendar events (virtual work items when no task exists)
SELECT
  e.id,
  'compliance' AS source_type,
  r.rule_code AS reference_number,
  r.display_name AS title,
  e.status,
  'medium' AS priority,
  e.due_date,
  e.created_at,
  e.updated_at,
  NULL::uuid AS assigned_to,
  NULL::uuid AS reviewer_id,
  e.client_id,
  c.business_name AS client_name,
  false AS is_blocked,
  false AS is_stuck,
  NULL::text AS stuck_reason_code,
  NULL::text AS verification_status,
  false AS is_verified,
  r.id AS rule_id,
  e.period_label,
  r.service_kind,
  NULL::numeric AS amount_involved,
  NULL::uuid AS sub_service_id,
  NULL::text AS sub_service_name,
  NULL::text AS service_name
FROM compliance_calendar_events e
LEFT JOIN compliance_calendar_rules r ON r.id = e.rule_id
LEFT JOIN clients c ON c.id = e.client_id
WHERE e.task_id IS NULL;  -- only show virtual events not yet linked to a task

-- Indexes for common filters (on the underlying tables, not the view)
CREATE INDEX IF NOT EXISTS idx_tasks_source_type ON tasks(is_deleted, status, due_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_notices_source_type ON notices(is_deleted, status, due_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_queries_source_type ON queries(is_deleted, status, created_at) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_compliance_events_unlinked ON compliance_calendar_events(task_id, due_date) WHERE task_id IS NULL;
