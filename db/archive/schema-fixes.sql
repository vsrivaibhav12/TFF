-- Schema fixes identified in comprehensive audit
-- Apply these AFTER base schema and schema-additions are in place

-- 1. Add NOT NULL + CHECK constraints to tasks boolean flags
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS chk_tasks_is_blocked_on_client,
  ALTER COLUMN is_blocked_on_client SET NOT NULL,
  ALTER COLUMN is_blocked_on_client SET DEFAULT FALSE,
  ADD CONSTRAINT chk_tasks_is_blocked_on_client CHECK (is_blocked_on_client IN (TRUE, FALSE));

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS chk_tasks_is_stuck,
  ALTER COLUMN is_stuck SET NOT NULL,
  ALTER COLUMN is_stuck SET DEFAULT FALSE,
  ADD CONSTRAINT chk_tasks_is_stuck CHECK (is_stuck IN (TRUE, FALSE));

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS chk_tasks_client_approval_required,
  ALTER COLUMN client_approval_required SET NOT NULL,
  ALTER COLUMN client_approval_required SET DEFAULT FALSE,
  ADD CONSTRAINT chk_tasks_client_approval_required CHECK (client_approval_required IN (TRUE, FALSE));

-- 2. verification_status: enforce allowed values matching the v3.3 schema
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS chk_tasks_verification_status;

ALTER TABLE tasks
  ADD CONSTRAINT chk_tasks_verification_status CHECK (
    verification_status IN ('not_required', 'pending', 'verified')
  );

-- 3. Drop duplicate unique index on compliance_calendar_events if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_compliance_calendar_events_unique_duplicate'
  ) THEN
    DROP INDEX idx_compliance_calendar_events_unique_duplicate;
  END IF;
END $$;

-- 4. Fix permission_requests.reviewed_by FK to reference users_profile(id) not auth.users(id)
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
