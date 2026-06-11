-- Unified inbox view for chronological work feed
-- SECURITY INVOKER ensures RLS on underlying tables is respected
-- All underlying queries filter is_deleted = false (or equivalent status filter)

CREATE OR REPLACE VIEW v_unified_inbox
WITH (security_invoker = true) AS

-- Tasks (assigned or created recently, not deleted)
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
  AND t.status IN ('pending', 'in_progress', 'awaiting_client')

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

-- Indexes for performance (on underlying tables)
CREATE INDEX IF NOT EXISTS idx_tasks_unified_inbox ON tasks(status, is_deleted, due_date) WHERE is_deleted = false AND status IN ('pending', 'in_progress', 'awaiting_client');
CREATE INDEX IF NOT EXISTS idx_notices_unified_inbox ON notices(status, is_deleted, due_date) WHERE is_deleted = false AND status != 'closed';
CREATE INDEX IF NOT EXISTS idx_queries_unified_inbox ON queries(status, is_deleted, created_at) WHERE is_deleted = false AND status != 'closed';
CREATE INDEX IF NOT EXISTS idx_compliance_events_unified_inbox ON compliance_calendar_events(task_id, due_date) WHERE task_id IS NULL;
