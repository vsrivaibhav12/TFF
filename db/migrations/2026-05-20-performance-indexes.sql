-- Performance indexes for frequently queried columns
-- Applied after comprehensive audit on 2026-05-20

-- Queries table
CREATE INDEX IF NOT EXISTS idx_queries_assigned_to ON queries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_queries_created_by ON queries(created_by);

-- Notices table
CREATE INDEX IF NOT EXISTS idx_notices_assigned_to ON notices(assigned_to);

-- Tasks table
CREATE INDEX IF NOT EXISTS idx_tasks_sub_service_id ON tasks(sub_service_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_billable ON tasks(is_billable) WHERE is_billable = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Compliance calendar events
CREATE INDEX IF NOT EXISTS idx_cce_rule_id ON compliance_calendar_events(rule_id);

-- Documents table (soft-delete filter)
CREATE INDEX IF NOT EXISTS idx_documents_is_deleted ON documents(is_deleted) WHERE is_deleted = false;

-- Credentials table (soft-delete filter)
CREATE INDEX IF NOT EXISTS idx_credentials_is_deleted ON credentials(is_deleted) WHERE is_deleted = false;

-- DSC records
CREATE INDEX IF NOT EXISTS idx_dsc_records_status ON dsc_records(status) WHERE status = 'active';

-- Users profile
CREATE INDEX IF NOT EXISTS idx_users_profile_manager_id ON users_profile(manager_id) WHERE is_active = true;

-- GST data entries
CREATE INDEX IF NOT EXISTS idx_gst_data_entries_period ON gst_data_entries(period_year, period_month);

-- Payroll runs
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(year, month);
