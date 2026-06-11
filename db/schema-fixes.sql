-- Schema fixes identified in comprehensive audit
-- Apply these AFTER base schema and schema-additions are in place

-- 1. task_template_steps must be created before task_steps FK references it
-- (This is already handled in schema ordering; this statement ensures idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'task_template_steps'
  ) THEN
    CREATE TABLE task_template_steps (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
      step_number int NOT NULL,
      title text NOT NULL,
      description text,
      estimated_minutes int,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- 2. Add NOT NULL + CHECK constraints to tasks boolean flags
ALTER TABLE tasks
  ALTER COLUMN is_blocked_on_client SET NOT NULL,
  ALTER COLUMN is_blocked_on_client SET DEFAULT FALSE,
  ADD CONSTRAINT chk_tasks_is_blocked_on_client CHECK (is_blocked_on_client IN (TRUE, FALSE));

ALTER TABLE tasks
  ALTER COLUMN is_stuck SET NOT NULL,
  ALTER COLUMN is_stuck SET DEFAULT FALSE,
  ADD CONSTRAINT chk_tasks_is_stuck CHECK (is_stuck IN (TRUE, FALSE));

ALTER TABLE tasks
  ALTER COLUMN client_approval_required SET NOT NULL,
  ALTER COLUMN client_approval_required SET DEFAULT FALSE,
  ADD CONSTRAINT chk_tasks_client_approval_required CHECK (client_approval_required IN (TRUE, FALSE));

-- verification_status: enforce allowed values
ALTER TABLE tasks
  ADD CONSTRAINT chk_tasks_verification_status CHECK (
    verification_status IS NULL OR verification_status IN ('pending','verified','rejected')
  );

-- 3. Update v_unified_inbox to filter is_blocked_on_client = TRUE instead of obsolete awaiting_client status
CREATE OR REPLACE VIEW v_unified_inbox AS
SELECT
  t.id,
  t.title,
  'task' AS item_type,
  t.status,
  t.priority,
  t.due_date,
  t.created_at,
  t.updated_at,
  c.id AS client_id,
  c.business_name AS client_name,
  u.full_name AS assignee_name,
  t.is_blocked_on_client,
  t.is_stuck
FROM tasks t
LEFT JOIN clients c ON t.client_id = c.id
LEFT JOIN users_profile u ON t.assignee_id = u.id
WHERE t.is_deleted = FALSE
  AND t.status NOT IN ('completed', 'cancelled')
  AND (t.is_blocked_on_client = TRUE OR t.due_date <= CURRENT_DATE + INTERVAL '7 days')

UNION ALL

SELECT
  n.id,
  COALESCE(n.subject, n.notice_type) AS title,
  'notice' AS item_type,
  n.status,
  'high' AS priority,
  n.due_date,
  n.created_at,
  n.updated_at,
  c.id AS client_id,
  c.business_name AS client_name,
  u.full_name AS assignee_name,
  FALSE AS is_blocked_on_client,
  FALSE AS is_stuck
FROM notices n
LEFT JOIN clients c ON n.client_id = c.id
LEFT JOIN users_profile u ON n.assigned_to = u.id
WHERE n.status NOT IN ('closed', 'resolved')
  AND (n.due_date <= CURRENT_DATE + INTERVAL '7 days' OR n.due_date IS NULL)

UNION ALL

SELECT
  q.id,
  q.subject AS title,
  'query' AS item_type,
  q.status,
  'medium' AS priority,
  NULL AS due_date,
  q.created_at,
  q.updated_at,
  c.id AS client_id,
  c.business_name AS client_name,
  u.full_name AS assignee_name,
  FALSE AS is_blocked_on_client,
  FALSE AS is_stuck
FROM queries q
LEFT JOIN clients c ON q.client_id = c.id
LEFT JOIN users_profile u ON q.assigned_to = u.id
WHERE q.status NOT IN ('resolved', 'closed')
  AND q.created_at >= CURRENT_DATE - INTERVAL '30 days';

-- 4. Drop duplicate unique index on compliance_calendar_events if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_compliance_calendar_events_unique_duplicate'
  ) THEN
    DROP INDEX idx_compliance_calendar_events_unique_duplicate;
  END IF;
END $$;

-- 5. Fix permission_requests.reviewed_by FK to reference users_profile(id) not auth.users(id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'permission_requests_reviewed_by_fkey'
      AND table_name = 'permission_requests'
  ) THEN
    ALTER TABLE permission_requests
      DROP CONSTRAINT permission_requests_reviewed_by_fkey;
  END IF;

  ALTER TABLE permission_requests
    ADD CONSTRAINT permission_requests_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES users_profile(id) ON DELETE SET NULL;
END $$;
