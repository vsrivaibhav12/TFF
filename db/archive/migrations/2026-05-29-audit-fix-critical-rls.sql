-- ============================================================================
-- CRITICAL AUDIT FIX — 2026-05-29
-- Fixes RLS security gaps and stale policies found in end-to-end audit.
-- Run via: npx tsx scripts/apply-rls-capabilities.ts (or SQL Editor)
-- ============================================================================

-- ============================================================================
-- 1. FIX STALE CLIENT TASK POLICIES (schema.sql v3 status migration)
--    After v3.3, 'awaiting_client' → 'in_progress' + is_blocked_on_client=TRUE.
--    The old policies referencing 'awaiting_client' never match any rows.
-- ============================================================================

-- Clients should see tasks that are:
--   • completed, OR
--   • in_progress AND blocked on client (the old "awaiting_client" concept)
DROP POLICY IF EXISTS "tasks_client_view" ON tasks;
CREATE POLICY "tasks_client_view" ON tasks
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM client_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
    AND (
      status = 'completed'
      OR (status = 'in_progress' AND is_blocked_on_client = TRUE)
    )
  );

-- Task steps visible to client for the same task set
DROP POLICY IF EXISTS "task_steps_client_read" ON task_steps;
CREATE POLICY "task_steps_client_read" ON task_steps
  FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE client_id IN (
        SELECT client_id FROM client_users
        WHERE user_id = auth.uid() AND is_active = TRUE
      )
      AND (
        status = 'completed'
        OR (status = 'in_progress' AND is_blocked_on_client = TRUE)
      )
    )
  );

-- ============================================================================
-- 2. FIX FOR-ALL DELETE LEAK IN rls-additive.sql
--    FOR ALL policies evaluate USING for DELETE. The first arm
--    "role IN ('admin','team')" allowed ANY team member to DELETE.
--    Split into SELECT (admin+team) + ALL-mutate (admin only).
-- ============================================================================

-- client_groups
DROP POLICY IF EXISTS "client_groups_admin" ON client_groups;
DROP POLICY IF EXISTS "client_groups_admin_select" ON client_groups;
CREATE POLICY "client_groups_admin_select" ON client_groups
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS "client_groups_admin_mutate" ON client_groups;
CREATE POLICY "client_groups_admin_mutate" ON client_groups
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- client_users
DROP POLICY IF EXISTS "client_users_admin" ON client_users;
DROP POLICY IF EXISTS "client_users_admin_select" ON client_users;
CREATE POLICY "client_users_admin_select" ON client_users
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team') OR user_id = auth.uid());
DROP POLICY IF EXISTS "client_users_admin_mutate" ON client_users;
CREATE POLICY "client_users_admin_mutate" ON client_users
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- team_client_assignment
DROP POLICY IF EXISTS "tca_admin" ON team_client_assignment;
DROP POLICY IF EXISTS "tca_admin_select" ON team_client_assignment;
CREATE POLICY "tca_admin_select" ON team_client_assignment
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS "tca_admin_mutate" ON team_client_assignment;
CREATE POLICY "tca_admin_mutate" ON team_client_assignment
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- client_services
DROP POLICY IF EXISTS "client_services_admin_team" ON client_services;
DROP POLICY IF EXISTS "client_services_admin_select" ON client_services;
CREATE POLICY "client_services_admin_select" ON client_services
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS "client_services_admin_mutate" ON client_services;
CREATE POLICY "client_services_admin_mutate" ON client_services
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- client_sub_services
DROP POLICY IF EXISTS "client_sub_services_admin_team" ON client_sub_services;
DROP POLICY IF EXISTS "client_sub_services_admin_select" ON client_sub_services;
CREATE POLICY "client_sub_services_admin_select" ON client_sub_services
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS "client_sub_services_admin_mutate" ON client_sub_services;
CREATE POLICY "client_sub_services_admin_mutate" ON client_sub_services
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- task_templates
DROP POLICY IF EXISTS "task_templates_team" ON task_templates;
DROP POLICY IF EXISTS "task_templates_team_select" ON task_templates;
CREATE POLICY "task_templates_team_select" ON task_templates
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS "task_templates_admin_mutate" ON task_templates;
CREATE POLICY "task_templates_admin_mutate" ON task_templates
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ============================================================================
-- 3. FIX OVERLY BROAD FOR-ALL POLICIES IN schema-v3-3.sql
--    Same pattern: first arm "role IN ('admin','team')" made DELETE open.
-- ============================================================================

-- client_compliance_profiles
DROP POLICY IF EXISTS ccp_admin ON client_compliance_profiles;
DROP POLICY IF EXISTS "ccp_admin_select" ON client_compliance_profiles;
CREATE POLICY ccp_admin_select ON client_compliance_profiles
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()));
DROP POLICY IF EXISTS "ccp_admin_mutate" ON client_compliance_profiles;
CREATE POLICY ccp_admin_mutate ON client_compliance_profiles
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- compliance_calendar_events
DROP POLICY IF EXISTS cce_admin ON compliance_calendar_events;
DROP POLICY IF EXISTS "cce_admin_select" ON compliance_calendar_events;
CREATE POLICY cce_admin_select ON compliance_calendar_events
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()));
DROP POLICY IF EXISTS "cce_admin_mutate" ON compliance_calendar_events;
CREATE POLICY cce_admin_mutate ON compliance_calendar_events
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- document_requests
DROP POLICY IF EXISTS docreq_team ON document_requests;
DROP POLICY IF EXISTS "docreq_team_select" ON document_requests;
CREATE POLICY docreq_team_select ON document_requests
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
    OR client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
  );
DROP POLICY IF EXISTS "docreq_team_insert" ON document_requests;
CREATE POLICY docreq_team_insert ON document_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "docreq_team_update" ON document_requests;
CREATE POLICY docreq_team_update ON document_requests
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "docreq_team_delete" ON document_requests;
CREATE POLICY docreq_team_delete ON document_requests
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

-- task_custom_field_values
DROP POLICY IF EXISTS tcfv_team ON task_custom_field_values;
DROP POLICY IF EXISTS "tcfv_team_select" ON task_custom_field_values;
CREATE POLICY tcfv_team_select ON task_custom_field_values
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "tcfv_team_insert" ON task_custom_field_values;
CREATE POLICY tcfv_team_insert ON task_custom_field_values
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "tcfv_team_update" ON task_custom_field_values;
CREATE POLICY tcfv_team_update ON task_custom_field_values
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "tcfv_team_delete" ON task_custom_field_values;
CREATE POLICY tcfv_team_delete ON task_custom_field_values
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );

-- task_label_assignments
DROP POLICY IF EXISTS tla_team ON task_label_assignments;
DROP POLICY IF EXISTS "tla_team_select" ON task_label_assignments;
CREATE POLICY tla_team_select ON task_label_assignments
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "tla_team_insert" ON task_label_assignments;
CREATE POLICY tla_team_insert ON task_label_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "tla_team_update" ON task_label_assignments;
CREATE POLICY tla_team_update ON task_label_assignments
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "tla_team_delete" ON task_label_assignments;
CREATE POLICY tla_team_delete ON task_label_assignments
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );

-- ============================================================================
-- 4. ADD MISSING RLS ON staff_payroll_settings
--    This table stores monthly_salary — sensitive HR data.
-- ============================================================================
ALTER TABLE staff_payroll_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sps_self_view ON staff_payroll_settings;
CREATE POLICY sps_self_view ON staff_payroll_settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() IN ('admin', 'team'));

DROP POLICY IF EXISTS sps_admin_mutate ON staff_payroll_settings;
CREATE POLICY sps_admin_mutate ON staff_payroll_settings
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ============================================================================
-- 5. ADD CLIENT SELECT POLICY FOR NOTICES
--    Clients were permanently locked out because no client-scoped policy existed.
-- ============================================================================
DROP POLICY IF EXISTS "notices_client_select" ON notices;
CREATE POLICY "notices_client_select" ON notices
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
  );

-- ============================================================================
-- 6. GRANTS
-- ============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
