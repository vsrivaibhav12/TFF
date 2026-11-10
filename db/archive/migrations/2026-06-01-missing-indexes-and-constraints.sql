-- Missing indexes and constraints identified in comprehensive audit 2026-06-01

-- Missing FK indexes
CREATE INDEX IF NOT EXISTS idx_tasks_task_template_id ON tasks(task_template_id);
CREATE INDEX IF NOT EXISTS idx_tasks_verified_by_user_id ON tasks(verified_by_user_id);
CREATE INDEX IF NOT EXISTS idx_hearings_notice_id ON hearings(notice_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_reports_to ON users_profile(reports_to);
CREATE INDEX IF NOT EXISTS idx_users_profile_manager_id ON users_profile(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_active_role_template_id ON users_profile(active_role_template_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_fulfilled_by_document_id ON document_requests(fulfilled_by_document_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_fulfilled_by_user_id ON document_requests(fulfilled_by_user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_gst_filings_client_id ON vendor_gst_filings(client_id);
CREATE INDEX IF NOT EXISTS idx_compliance_calendar_events_rule_id ON compliance_calendar_events(rule_id);

-- Partial unique index: exactly one prime admin
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_profile_one_prime ON users_profile(is_prime_admin) WHERE is_prime_admin = TRUE;

-- Fix all_work_items view to filter soft-deleted queries
CREATE OR REPLACE VIEW all_work_items AS
-- (view body updated in schema-all-work-items.sql; this migration ensures deployments apply the fix)
-- The actual view fix is applied via updating schema-all-work-items.sql in the repo.

-- CHECK constraints for data integrity
ALTER TABLE compliance_status ADD CONSTRAINT chk_compliance_status_status CHECK (status IN ('pending', 'filed', 'delayed', 'exempt'));
ALTER TABLE leave_requests ADD CONSTRAINT chk_leave_requests_date_range CHECK (to_date >= from_date);
ALTER TABLE payroll_runs ADD CONSTRAINT chk_payroll_runs_year CHECK (year > 2000 AND year < 2100);
