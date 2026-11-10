-- Query rewrites — Phase 2
-- Date: 2026-07-03
-- Adds SQL-side aggregation functions and fixes the unified inbox view filter.
-- All changes are additive / idempotent.

-- ============================================================================
-- Aggregate helpers
-- ============================================================================

-- Single-round-trip task status counts.
CREATE OR REPLACE FUNCTION count_tasks_by_status(p_assigned_to UUID DEFAULT NULL, p_client_id UUID DEFAULT NULL)
RETURNS TABLE(status TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT t.status, COUNT(*)::bigint
  FROM tasks t
  WHERE t.is_deleted = false
    AND (p_assigned_to IS NULL OR t.assigned_to = p_assigned_to)
    AND (p_client_id IS NULL OR t.client_id = p_client_id)
    AND t.status IN ('pending', 'in_progress', 'completed', 'cancelled')
  GROUP BY t.status;
$$;

-- Task closure velocity grouped by date in SQL.
CREATE OR REPLACE FUNCTION get_task_closure_velocity(p_days INT DEFAULT 30)
RETURNS TABLE(date TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    ((t.updated_at AT TIME ZONE 'Asia/Kolkata')::date)::text AS date,
    COUNT(*)::bigint AS count
  FROM tasks t
  WHERE t.status = 'completed'
    AND t.updated_at >= (NOW() - (p_days || ' days')::interval)
  GROUP BY date
  ORDER BY date;
$$;

-- Workdone summary grouped by user + client in SQL.
CREATE OR REPLACE FUNCTION list_workdone_summary(p_from DATE, p_to DATE)
RETURNS TABLE(user_id UUID, user_name TEXT, client_id UUID, client_name TEXT, total_minutes BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    tw.user_id,
    up.full_name AS user_name,
    tw.client_id,
    c.business_name AS client_name,
    SUM(tw.duration_minutes)::bigint AS total_minutes
  FROM task_workdone tw
  LEFT JOIN users_profile up ON up.id = tw.user_id
  LEFT JOIN clients c ON c.id = tw.client_id
  WHERE tw.work_date >= p_from AND tw.work_date <= p_to
  GROUP BY tw.user_id, up.full_name, tw.client_id, c.business_name
  ORDER BY total_minutes DESC;
$$;

-- ============================================================================
-- Unified inbox view: remove dead 'awaiting_client' branch
-- ============================================================================

CREATE OR REPLACE VIEW v_unified_inbox
WITH (security_invoker = true) AS

-- Tasks (open, not deleted)
SELECT
  t.id,
  'task' AS item_type,
  t.title,
  t.status,
  t.priority,
  t.due_date,
  t.created_at AS occurred_at,
  t.assigned_to AS actor_id,
  t.client_id,
  c.business_name AS client_name,
  NULL::uuid AS related_entity_id,
  NULL::text AS related_entity_type,
  jsonb_build_object(
    'task_number', t.task_number,
    'is_stuck', t.is_stuck,
    'is_blocked_on_client', t.is_blocked_on_client
  ) AS meta
FROM tasks t
LEFT JOIN clients c ON c.id = t.client_id
WHERE t.is_deleted = false
  AND t.status IN ('pending', 'in_progress')

UNION ALL

-- Notices (open, not deleted)
SELECT
  n.id,
  'notice' AS item_type,
  COALESCE(n.subject, n.notice_type::text) AS title,
  n.status,
  'high' AS priority,
  n.due_date,
  n.notice_received_date AS occurred_at,
  n.assigned_to AS actor_id,
  n.client_id,
  c.business_name AS client_name,
  NULL::uuid AS related_entity_id,
  NULL::text AS related_entity_type,
  jsonb_build_object(
    'notice_type', n.notice_type,
    'authority', n.issuing_authority,
    'amount_involved', n.amount_involved
  ) AS meta
FROM notices n
LEFT JOIN clients c ON c.id = n.client_id
WHERE n.is_deleted = false
  AND n.status != 'closed'

UNION ALL

-- Queries (not closed, not deleted)
SELECT
  q.id,
  'query' AS item_type,
  q.subject AS title,
  q.status,
  q.priority,
  NULL::date AS due_date,
  q.created_at AS occurred_at,
  q.created_by AS actor_id,
  q.client_id,
  c.business_name AS client_name,
  NULL::uuid AS related_entity_id,
  NULL::text AS related_entity_type,
  jsonb_build_object(
    'query_id', q.id
  ) AS meta
FROM queries q
LEFT JOIN clients c ON c.id = q.client_id
WHERE q.is_deleted = false
  AND q.status != 'closed'

UNION ALL

-- Compliance calendar events (virtual work items when no task exists)
SELECT
  e.id,
  'compliance' AS item_type,
  r.display_name AS title,
  e.status,
  'medium' AS priority,
  e.due_date,
  e.generated_at AS occurred_at,
  NULL::uuid AS actor_id,
  e.client_id,
  c.business_name AS client_name,
  e.task_id AS related_entity_id,
  'task' AS related_entity_type,
  jsonb_build_object(
    'rule_code', r.rule_code,
    'service_kind', r.service_kind,
    'period_label', e.period_label
  ) AS meta
FROM compliance_calendar_events e
LEFT JOIN compliance_calendar_rules r ON r.id = e.rule_id
LEFT JOIN clients c ON c.id = e.client_id
WHERE e.task_id IS NULL
  AND e.is_deleted = false;

-- Refresh partial index to match the updated view filter.
DROP INDEX IF EXISTS idx_tasks_unified_inbox;
CREATE INDEX IF NOT EXISTS idx_tasks_unified_inbox
  ON tasks(status, is_deleted, due_date)
  WHERE is_deleted = false AND status IN ('pending', 'in_progress');
