-- ============================================================================
-- Fix column-level UNIQUE constraints on soft-deletable tables.
--
-- Problem: When a row is soft-deleted (is_deleted = TRUE), its value in a
-- UNIQUE column still occupies the constraint, preventing reuse of that value
-- for a new row. For example, deleting a service with code 'IT' then trying
-- to create a new service with code 'IT' fails with:
--   "duplicate key value violates unique constraint services_code_key"
--
-- Fix: Replace column-level UNIQUE constraints with partial unique indexes
-- that only enforce uniqueness among non-deleted rows.
-- ============================================================================

-- 1) services.code
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_code_active
  ON services(code) WHERE is_deleted = FALSE;

-- 2) client_groups.name
ALTER TABLE client_groups DROP CONSTRAINT IF EXISTS client_groups_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_groups_name_active
  ON client_groups(name) WHERE is_deleted = FALSE;

-- 3) tasks.task_number
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_task_number_active
  ON tasks(task_number) WHERE is_deleted = FALSE;

-- 4) dsc_records.certificate_serial
ALTER TABLE dsc_records DROP CONSTRAINT IF EXISTS dsc_records_certificate_serial_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dsc_records_serial_active
  ON dsc_records(certificate_serial) WHERE is_deleted = FALSE;

-- 5) service_categories.name
ALTER TABLE service_categories DROP CONSTRAINT IF EXISTS service_categories_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_categories_name_active
  ON service_categories(name) WHERE is_deleted = FALSE;

-- 6) clients.pan
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_pan_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_pan_active
  ON clients(pan) WHERE is_deleted = FALSE;

-- 7) staff_role_templates.name (schema-additions.sql)
ALTER TABLE staff_role_templates DROP CONSTRAINT IF EXISTS staff_role_templates_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_role_templates_name_active
  ON staff_role_templates(name) WHERE is_deleted = FALSE;
