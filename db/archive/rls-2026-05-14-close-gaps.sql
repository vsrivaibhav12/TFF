-- ============================================================================
-- RLS Close-Gaps — 2026-05-14
-- Fixes: 12 tables with RLS disabled + vendors (RLS on, 0 policies)
-- Run via: npx tsx scripts/apply-rls-close-gaps.ts
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. notifications — personal only
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notif_self_select ON public.notifications;
CREATE POLICY notif_self_select ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS notif_self_insert ON public.notifications;
CREATE POLICY notif_self_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notif_staff_insert ON public.notifications;
CREATE POLICY notif_staff_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS notif_self_update ON public.notifications;
CREATE POLICY notif_self_update ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notif_staff_update ON public.notifications;
CREATE POLICY notif_staff_update ON public.notifications FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS notif_self_delete ON public.notifications;
CREATE POLICY notif_self_delete ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. global_audit_log — admin read, authenticated self-insert
-- ---------------------------------------------------------------------------
ALTER TABLE public.global_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_admin_select ON public.global_audit_log;
CREATE POLICY audit_admin_select ON public.global_audit_log FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS audit_auth_insert ON public.global_audit_log;
CREATE POLICY audit_auth_insert ON public.global_audit_log FOR INSERT TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- No UPDATE/DELETE for authenticated — service_role bypasses RLS if needed

-- ---------------------------------------------------------------------------
-- 3. leave_requests — self + admin
-- ---------------------------------------------------------------------------
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leave_self_select ON public.leave_requests;
CREATE POLICY leave_self_select ON public.leave_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS leave_self_insert ON public.leave_requests;
CREATE POLICY leave_self_insert ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS leave_self_update ON public.leave_requests;
CREATE POLICY leave_self_update ON public.leave_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 4. payroll_adjustments — admin only (ties to payroll_runs)
-- ---------------------------------------------------------------------------
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_adj_admin ON public.payroll_adjustments;
CREATE POLICY payroll_adj_admin ON public.payroll_adjustments FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 5. hearings — admin/team read; client scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.hearings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hearings_admin_team ON public.hearings;
CREATE POLICY hearings_admin_team ON public.hearings FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS hearings_client ON public.hearings;
CREATE POLICY hearings_client ON public.hearings FOR SELECT TO authenticated
  USING (client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));

-- ---------------------------------------------------------------------------
-- 6. compliance_insights — admin/team read; client scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.compliance_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS insights_admin_team ON public.compliance_insights;
CREATE POLICY insights_admin_team ON public.compliance_insights FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS insights_client ON public.compliance_insights;
CREATE POLICY insights_client ON public.compliance_insights FOR SELECT TO authenticated
  USING (client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));

-- ---------------------------------------------------------------------------
-- 7. engagement_letters — admin/team; client scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.engagement_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS el_admin_team ON public.engagement_letters;
CREATE POLICY el_admin_team ON public.engagement_letters FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS el_client ON public.engagement_letters;
CREATE POLICY el_client ON public.engagement_letters FOR SELECT TO authenticated
  USING (client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));

-- ---------------------------------------------------------------------------
-- 8. client_lifecycle_stage — admin/team; client scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.client_lifecycle_stage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cls_admin_team ON public.client_lifecycle_stage;
CREATE POLICY cls_admin_team ON public.client_lifecycle_stage FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS cls_client ON public.client_lifecycle_stage;
CREATE POLICY cls_client ON public.client_lifecycle_stage FOR SELECT TO authenticated
  USING (client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));

-- ---------------------------------------------------------------------------
-- 9. client_feature_flags — admin/team; client scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.client_feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cff_admin_team ON public.client_feature_flags;
CREATE POLICY cff_admin_team ON public.client_feature_flags FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS cff_client ON public.client_feature_flags;
CREATE POLICY cff_client ON public.client_feature_flags FOR SELECT TO authenticated
  USING (client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));

-- ---------------------------------------------------------------------------
-- 10. firm_profile — read-only for all; admin write
-- ---------------------------------------------------------------------------
ALTER TABLE public.firm_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS firm_read_all ON public.firm_profile;
CREATE POLICY firm_read_all ON public.firm_profile FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS firm_admin_write ON public.firm_profile;
CREATE POLICY firm_admin_write ON public.firm_profile FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 11. vendor_gst_filings — admin/team only
-- ---------------------------------------------------------------------------
ALTER TABLE public.vendor_gst_filings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vgf_admin_team ON public.vendor_gst_filings;
CREATE POLICY vgf_admin_team ON public.vendor_gst_filings FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));

-- ---------------------------------------------------------------------------
-- 12. benchmarks — read-only reference data
-- ---------------------------------------------------------------------------
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bench_read_all ON public.benchmarks;
CREATE POLICY bench_read_all ON public.benchmarks FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 13. vendors — RLS enabled but 0 policies (lockout). Add admin/team read.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS vendors_admin_team ON public.vendors;
CREATE POLICY vendors_admin_team ON public.vendors FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));

-- ============================================================================
-- Grants
-- ============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
