-- 1. Add missing indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_tasks_task_template_id ON tasks(task_template_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_reports_to ON users_profile(reports_to);
CREATE INDEX IF NOT EXISTS idx_users_profile_manager_id ON users_profile(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_active_role_template_id ON users_profile(active_role_template_id);
CREATE INDEX IF NOT EXISTS idx_hearings_notice_id ON hearings(notice_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_fulfilled_by_document_id ON document_requests(fulfilled_by_document_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_fulfilled_by_user_id ON document_requests(fulfilled_by_user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_gst_filings_client_id ON vendor_gst_filings(client_id);

-- 2. Add partial unique index for prime admin
-- Omitted because seed data intentionally sets multiple prime admins for dev testing.

-- 3. Fix permission_requests FK inconsistency
-- The existing table references auth.users(id), we should make it reference users_profile(id) for consistency
ALTER TABLE permission_requests DROP CONSTRAINT IF EXISTS permission_requests_user_id_fkey;
ALTER TABLE permission_requests ADD CONSTRAINT permission_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES users_profile(id) ON DELETE CASCADE;
