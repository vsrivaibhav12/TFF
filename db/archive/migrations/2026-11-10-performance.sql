-- ============================================================================
-- 2026-11-10  Performance: RLS initplan rewrite, missing FK indexes, duplicate indexes
-- Generated from the live database. Safe to re-run (policies are re-altered,
-- indexes use IF NOT EXISTS / IF EXISTS).
-- ============================================================================

-- 1. RLS policies: evaluate auth.uid() and helper functions once per query
ALTER POLICY "attendance_admin_insert" ON public."attendance_logs" WITH CHECK ((( SELECT users_profile.role
   FROM users_profile
  WHERE (users_profile.id = (SELECT auth.uid()))) = 'admin'::text));
ALTER POLICY "attendance_admin_update" ON public."attendance_logs" USING ((( SELECT users_profile.role
   FROM users_profile
  WHERE (users_profile.id = (SELECT auth.uid()))) = 'admin'::text)) WITH CHECK ((( SELECT users_profile.role
   FROM users_profile
  WHERE (users_profile.id = (SELECT auth.uid()))) = 'admin'::text));
ALTER POLICY "attendance_direct_reports" ON public."attendance_logs" USING ((( SELECT users_profile.reports_to
   FROM users_profile
  WHERE (users_profile.id = attendance_logs.user_id)) = (SELECT auth.uid())));
ALTER POLICY "attendance_logs_team_approve" ON public."attendance_logs" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('attendance.approve'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('attendance.approve'::text))));
ALTER POLICY "attendance_logs_team_view_all" ON public."attendance_logs" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('attendance.view_all'::text))));
ALTER POLICY "attendance_manager_insert" ON public."attendance_logs" WITH CHECK ((( SELECT users_profile.reports_to
   FROM users_profile
  WHERE (users_profile.id = attendance_logs.user_id)) = (SELECT auth.uid())));
ALTER POLICY "attendance_manager_update" ON public."attendance_logs" USING ((( SELECT users_profile.reports_to
   FROM users_profile
  WHERE (users_profile.id = attendance_logs.user_id)) = (SELECT auth.uid()))) WITH CHECK ((( SELECT users_profile.reports_to
   FROM users_profile
  WHERE (users_profile.id = attendance_logs.user_id)) = (SELECT auth.uid())));
ALTER POLICY "attendance_own_insert" ON public."attendance_logs" WITH CHECK ((user_id = (SELECT auth.uid())));
ALTER POLICY "attendance_own_update" ON public."attendance_logs" USING ((user_id = (SELECT auth.uid()))) WITH CHECK ((user_id = (SELECT auth.uid())));
ALTER POLICY "attendance_own_view" ON public."attendance_logs" USING (((user_id = (SELECT auth.uid())) OR (( SELECT users_profile.role
   FROM users_profile
  WHERE (users_profile.id = (SELECT auth.uid()))) = ANY (ARRAY['admin'::text, 'team'::text]))));
ALTER POLICY "be_admin" ON public."billing_entities" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "be_read" ON public."billing_entities" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (id IN ( SELECT user_billing_entity_access.billing_entity_id
   FROM user_billing_entity_access
  WHERE (user_billing_entity_access.user_id = (SELECT auth.uid()))))));
ALTER POLICY "billing_entities_team_manage" ON public."billing_entities" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_billing_entities'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_billing_entities'::text))));
ALTER POLICY "ccp_admin" ON public."client_compliance_profiles" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text]))) WITH CHECK (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])));
ALTER POLICY "ccp_admin_mutate" ON public."client_compliance_profiles" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "ccp_admin_select" ON public."client_compliance_profiles" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))));
ALTER POLICY "ccp_team_read" ON public."client_compliance_profiles" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))));
ALTER POLICY "client_groups_admin" ON public."client_groups" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text]))) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "client_groups_admin_mutate" ON public."client_groups" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "client_groups_admin_select" ON public."client_groups" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])));
ALTER POLICY "import_batches_admin" ON public."client_import_batches" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "client_services_admin_mutate" ON public."client_services" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "client_services_admin_select" ON public."client_services" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])));
ALTER POLICY "client_services_admin_team" ON public."client_services" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text]))) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "client_services_team_write" ON public."client_services" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('services.assign'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('services.assign'::text))));
ALTER POLICY "client_sub_services_admin_mutate" ON public."client_sub_services" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "client_sub_services_admin_select" ON public."client_sub_services" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])));
ALTER POLICY "client_sub_services_admin_team" ON public."client_sub_services" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text]))) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "client_sub_services_team_write" ON public."client_sub_services" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('services.assign'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('services.assign'::text))));
ALTER POLICY "client_users_admin" ON public."client_users" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (user_id = (SELECT auth.uid())))) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "client_users_admin_mutate" ON public."client_users" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "client_users_admin_select" ON public."client_users" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (user_id = (SELECT auth.uid()))));
ALTER POLICY "clients_admin_all" ON public."clients" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "clients_select_own" ON public."clients" USING ((id IN ( SELECT client_users.client_id
   FROM client_users
  WHERE ((client_users.user_id = (SELECT auth.uid())) AND (client_users.is_active = true)))));
ALTER POLICY "clients_team_delete" ON public."clients" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('clients.delete'::text))));
ALTER POLICY "clients_team_insert" ON public."clients" WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('clients.create'::text))));
ALTER POLICY "clients_team_select" ON public."clients" USING ((((SELECT current_user_role()) = 'team'::text) AND ((id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('clients.read.all'::text)))));
ALTER POLICY "clients_team_update" ON public."clients" USING ((((SELECT current_user_role()) = 'team'::text) AND ((id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('clients.edit'::text)) OR (SELECT user_has_capability('clients.toggle_portal'::text)))));
ALTER POLICY "clients_update_own_limited" ON public."clients" USING ((id IN ( SELECT client_users.client_id
   FROM client_users
  WHERE ((client_users.user_id = (SELECT auth.uid())) AND (client_users.is_active = true)))));
ALTER POLICY "cce_admin" ON public."compliance_calendar_events" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text]))) WITH CHECK (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])));
ALTER POLICY "cce_admin_mutate" ON public."compliance_calendar_events" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "cce_admin_select" ON public."compliance_calendar_events" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))));
ALTER POLICY "cce_client" ON public."compliance_calendar_events" USING ((client_id IN ( SELECT client_users.client_id
   FROM client_users
  WHERE ((client_users.user_id = (SELECT auth.uid())) AND (client_users.is_active = true)))));
ALTER POLICY "cce_team" ON public."compliance_calendar_events" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))));
ALTER POLICY "ccr_admin" ON public."compliance_calendar_rules" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "compliance_calendar_rules_team_manage" ON public."compliance_calendar_rules" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_compliance_rules'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_compliance_rules'::text))));
ALTER POLICY "compliance_status_admin" ON public."compliance_status" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "compliance_status_team_select" ON public."compliance_status" USING ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('compliance.view'::text)) OR (SELECT user_has_capability('compliance.enter'::text)))));
ALTER POLICY "compliance_status_team_update" ON public."compliance_status" USING ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('compliance.enter'::text))))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('compliance.enter'::text)))));
ALTER POLICY "cc_admin" ON public."cost_centres" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "cost_centres_team_manage" ON public."cost_centres" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_billing_entities'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_billing_entities'::text))));
ALTER POLICY "credentials_admin_all" ON public."credentials" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "credentials_admin_select" ON public."credentials" USING (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "credentials_team_insert" ON public."credentials" WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('credentials.manage'::text)))));
ALTER POLICY "credentials_team_select" ON public."credentials" USING ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('credentials.manage'::text)))));
ALTER POLICY "credentials_team_update" ON public."credentials" USING ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('credentials.manage'::text))))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('credentials.manage'::text)))));
ALTER POLICY "credentials_team_view_select" ON public."credentials" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('credentials.view'::text))));
ALTER POLICY "dsc_records_admin_all" ON public."dsc_records" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "dsc_records_admin_select" ON public."dsc_records" USING (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "dsc_records_team_insert" ON public."dsc_records" WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('dsc.manage'::text)))));
ALTER POLICY "dsc_records_team_select" ON public."dsc_records" USING ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('dsc.manage'::text)))));
ALTER POLICY "dsc_records_team_update" ON public."dsc_records" USING ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('dsc.manage'::text))))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('dsc.manage'::text)))));
ALTER POLICY "dsc_records_team_view_select" ON public."dsc_records" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('dsc.view'::text))));
ALTER POLICY "audit_admin_select" ON public."global_audit_log" USING (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "audit_auth_insert" ON public."global_audit_log" WITH CHECK ((performed_by = (SELECT auth.uid())));
ALTER POLICY "audit_log_team_view" ON public."global_audit_log" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('audit.view'::text))));
ALTER POLICY "leave_requests_team_approve" ON public."leave_requests" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('leave.approve'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('leave.approve'::text))));
ALTER POLICY "leave_self_insert" ON public."leave_requests" WITH CHECK ((user_id = (SELECT auth.uid())));
ALTER POLICY "leave_self_select" ON public."leave_requests" USING (((user_id = (SELECT auth.uid())) OR ((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text]))));
ALTER POLICY "leave_self_update" ON public."leave_requests" USING (((user_id = (SELECT auth.uid())) OR ((SELECT current_user_role()) = 'admin'::text))) WITH CHECK (((user_id = (SELECT auth.uid())) OR ((SELECT current_user_role()) = 'admin'::text)));
ALTER POLICY "notif_prefs_admin" ON public."notification_preferences" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "notif_prefs_self" ON public."notification_preferences" USING ((user_id = (SELECT auth.uid()))) WITH CHECK ((user_id = (SELECT auth.uid())));
ALTER POLICY "notif_self_delete" ON public."notifications" USING ((user_id = (SELECT auth.uid())));
ALTER POLICY "notif_self_insert" ON public."notifications" WITH CHECK ((user_id = (SELECT auth.uid())));
ALTER POLICY "notif_self_select" ON public."notifications" USING ((user_id = (SELECT auth.uid())));
ALTER POLICY "notif_self_update" ON public."notifications" USING ((user_id = (SELECT auth.uid()))) WITH CHECK ((user_id = (SELECT auth.uid())));
ALTER POLICY "notif_staff_insert" ON public."notifications" WITH CHECK (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])));
ALTER POLICY "notif_staff_update" ON public."notifications" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text]))) WITH CHECK (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])));
ALTER POLICY "permission_admin_all" ON public."permission_requests" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "permission_requests_team_approve" ON public."permission_requests" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('permission.approve'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('permission.approve'::text))));
ALTER POLICY "permission_user_own" ON public."permission_requests" USING ((user_id = (SELECT auth.uid()))) WITH CHECK ((user_id = (SELECT auth.uid())));
ALTER POLICY "pc_admin" ON public."profit_centres" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "profit_centres_team_manage" ON public."profit_centres" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_billing_entities'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_billing_entities'::text))));
ALTER POLICY "catalogue_admin" ON public."service_categories" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "services_admin" ON public."services" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "services_team_mutate" ON public."services" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('services.manage'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('services.manage'::text))));
ALTER POLICY "services_team_view_select" ON public."services" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('services.view'::text))));
ALTER POLICY "staff_caps_admin_all" ON public."staff_capabilities" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "staff_caps_self_view" ON public."staff_capabilities" USING ((user_id = (SELECT auth.uid())));
ALTER POLICY "staff_caps_team_grant" ON public."staff_capabilities" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('staff.grant_capabilities'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('staff.grant_capabilities'::text))));
ALTER POLICY "role_template_caps_admin" ON public."staff_role_template_capabilities" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "role_templates_admin" ON public."staff_role_templates" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "role_templates_team_read" ON public."staff_role_templates" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])));
ALTER POLICY "sop_admin" ON public."sub_service_sop_steps" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "sop_team_read" ON public."sub_service_sop_steps" USING (((SELECT current_user_role()) = ANY (ARRAY['team'::text, 'admin'::text])));
ALTER POLICY "sub_services_admin" ON public."sub_services" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "sub_services_team_mutate" ON public."sub_services" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('services.manage'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('services.manage'::text))));
ALTER POLICY "sub_services_team_view_select" ON public."sub_services" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('services.view'::text))));
ALTER POLICY "task_assignees_admin_all" ON public."task_assignees" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "task_assignees_team_manage" ON public."task_assignees" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('tasks.assign'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('tasks.assign'::text))));
ALTER POLICY "task_assignees_team_read" ON public."task_assignees" USING ((((SELECT current_user_role()) = 'team'::text) AND ((SELECT user_has_capability('tasks.view'::text)) OR (SELECT user_has_capability('tasks.edit'::text)) OR (SELECT user_has_capability('tasks.assign'::text)) OR (SELECT user_has_capability('tasks.complete'::text)) OR (SELECT user_has_capability('tasks.create'::text)) OR (SELECT user_has_capability('tasks.delete'::text)) OR (user_id = (SELECT auth.uid())))));
ALTER POLICY "task_custom_field_definitions_team_manage" ON public."task_custom_field_definitions" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_custom_fields'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_custom_fields'::text))));
ALTER POLICY "tcfd_admin" ON public."task_custom_field_definitions" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "tcfv_team" ON public."task_custom_field_values" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))))))) WITH CHECK ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))))));
ALTER POLICY "tcfv_team_delete" ON public."task_custom_field_values" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))))));
ALTER POLICY "tcfv_team_insert" ON public."task_custom_field_values" WITH CHECK ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))))));
ALTER POLICY "tcfv_team_select" ON public."task_custom_field_values" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))))));
ALTER POLICY "tcfv_team_update" ON public."task_custom_field_values" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))))))) WITH CHECK ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))))));
ALTER POLICY "tla_team" ON public."task_label_assignments" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))))))) WITH CHECK ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))))));
ALTER POLICY "tla_team_delete" ON public."task_label_assignments" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))))));
ALTER POLICY "tla_team_insert" ON public."task_label_assignments" WITH CHECK ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))))));
ALTER POLICY "tla_team_select" ON public."task_label_assignments" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))))));
ALTER POLICY "tla_team_update" ON public."task_label_assignments" USING ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))))))) WITH CHECK ((((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid()))))))));
ALTER POLICY "task_labels_team_manage" ON public."task_labels" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_labels'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_labels'::text))));
ALTER POLICY "tl_admin" ON public."task_labels" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "task_steps_admin" ON public."task_steps" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "task_steps_client_read" ON public."task_steps" USING ((task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE ((tasks.client_id IN ( SELECT client_users.client_id
           FROM client_users
          WHERE ((client_users.user_id = (SELECT auth.uid())) AND (client_users.is_active = true)))) AND (tasks.status = ANY (ARRAY['in_progress'::text, 'completed'::text])) AND ((tasks.status <> 'in_progress'::text) OR (tasks.is_blocked_on_client = true))))));
ALTER POLICY "task_steps_team" ON public."task_steps" USING ((((SELECT current_user_role()) = 'team'::text) AND ((task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))))) OR (SELECT user_has_capability('tasks.assign'::text)) OR (SELECT user_has_capability('tasks.complete'::text)) OR (SELECT user_has_capability('tasks.create'::text))))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND ((task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))))) OR (SELECT user_has_capability('tasks.assign'::text)) OR (SELECT user_has_capability('tasks.complete'::text)) OR (SELECT user_has_capability('tasks.create'::text)))));
ALTER POLICY "task_template_steps_admin" ON public."task_template_steps" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "task_template_steps_team_read" ON public."task_template_steps" USING (((SELECT current_user_role()) = ANY (ARRAY['team'::text, 'admin'::text])));
ALTER POLICY "task_templates_admin_mutate" ON public."task_templates" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "task_templates_team" ON public."task_templates" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text]))) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "task_templates_team_select" ON public."task_templates" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])));
ALTER POLICY "task_workdone_team_manage" ON public."task_workdone" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('workdone.manage'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('workdone.manage'::text))));
ALTER POLICY "task_workdone_team_view_all" ON public."task_workdone" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('view_workdone_reports'::text))));
ALTER POLICY "wd_self" ON public."task_workdone" USING (((user_id = (SELECT auth.uid())) OR ((SELECT current_user_role()) = 'admin'::text))) WITH CHECK (((user_id = (SELECT auth.uid())) OR ((SELECT current_user_role()) = 'admin'::text)));
ALTER POLICY "wd_team_read" ON public."task_workdone" USING ((((SELECT current_user_role()) = 'admin'::text) OR (((SELECT current_user_role()) = 'team'::text) AND ((user_id = (SELECT auth.uid())) OR (SELECT user_has_capability('view_workdone_reports'::text))))));
ALTER POLICY "tasks_admin_all" ON public."tasks" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "tasks_client_view" ON public."tasks" USING (((client_id IN ( SELECT client_users.client_id
   FROM client_users
  WHERE ((client_users.user_id = (SELECT auth.uid())) AND (client_users.is_active = true)))) AND ((status = 'completed'::text) OR ((status = 'in_progress'::text) AND (is_blocked_on_client = true)))));
ALTER POLICY "tasks_team_delete" ON public."tasks" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('tasks.delete'::text))));
ALTER POLICY "tasks_team_insert" ON public."tasks" WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (SELECT user_has_capability('tasks.create'::text)) OR (SELECT user_has_capability('tasks.assign'::text)))));
ALTER POLICY "tasks_team_update_own" ON public."tasks" USING ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (assigned_to = (SELECT auth.uid())) OR (reviewer_id = (SELECT auth.uid())) OR (SELECT user_has_capability('tasks.edit'::text)))));
ALTER POLICY "tasks_team_verify" ON public."tasks" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('verify_tasks'::text))));
ALTER POLICY "tasks_team_view" ON public."tasks" USING ((((SELECT current_user_role()) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = (SELECT auth.uid())))) OR (assigned_to = (SELECT auth.uid())) OR (reviewer_id = (SELECT auth.uid())) OR (SELECT user_has_capability('tasks.view'::text)) OR (SELECT user_has_capability('tasks.assign'::text)) OR (SELECT user_has_capability('tasks.complete'::text)) OR (SELECT user_has_capability('tasks.create'::text)) OR (SELECT user_has_capability('tasks.edit'::text)))));
ALTER POLICY "tca_admin" ON public."team_client_assignment" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text]))) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "tca_admin_mutate" ON public."team_client_assignment" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "tca_admin_select" ON public."team_client_assignment" USING (((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text])));
ALTER POLICY "tca_team_write" ON public."team_client_assignment" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('clients.assign_team'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('clients.assign_team'::text))));
ALTER POLICY "ubea_admin" ON public."user_billing_entity_access" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "ubea_self" ON public."user_billing_entity_access" USING (((user_id = (SELECT auth.uid())) OR ((SELECT current_user_role()) = 'admin'::text)));
ALTER POLICY "user_billing_entity_access_team_manage" ON public."user_billing_entity_access" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_billing_entities'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('manage_billing_entities'::text))));
ALTER POLICY "profiles_admin_all" ON public."users_profile" USING (((SELECT current_user_role()) = 'admin'::text)) WITH CHECK (((SELECT current_user_role()) = 'admin'::text));
ALTER POLICY "profiles_self_update" ON public."users_profile" USING ((id = (SELECT auth.uid()))) WITH CHECK ((id = (SELECT auth.uid())));
ALTER POLICY "profiles_self_view" ON public."users_profile" USING (((id = (SELECT auth.uid())) OR ((SELECT current_user_role()) = ANY (ARRAY['admin'::text, 'team'::text]))));
ALTER POLICY "users_profile_team_manage" ON public."users_profile" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('staff.manage'::text)) AND (is_prime_admin = false))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('staff.manage'::text)) AND (is_prime_admin = false)));
ALTER POLICY "weekly_timesheet_submissions_team_approve" ON public."weekly_timesheet_submissions" USING ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('attendance.approve'::text)))) WITH CHECK ((((SELECT current_user_role()) = 'team'::text) AND (SELECT user_has_capability('attendance.approve'::text))));
ALTER POLICY "weekly_ts_insert_own" ON public."weekly_timesheet_submissions" WITH CHECK ((user_id = (SELECT auth.uid())));
ALTER POLICY "weekly_ts_select_manager" ON public."weekly_timesheet_submissions" USING ((manager_id = (SELECT auth.uid())));
ALTER POLICY "weekly_ts_select_own" ON public."weekly_timesheet_submissions" USING ((user_id = (SELECT auth.uid())));
ALTER POLICY "weekly_ts_update_manager" ON public."weekly_timesheet_submissions" USING ((manager_id = (SELECT auth.uid())));

-- 2. Indexes for foreign keys that had none (speeds joins, deletes and cascades)
CREATE INDEX IF NOT EXISTS idx_attendance_logs_overridden_by ON public."attendance_logs" ("overridden_by");
CREATE INDEX IF NOT EXISTS idx_billing_entities_default_profit_centre_code ON public."billing_entities" ("default_profit_centre_code");
CREATE INDEX IF NOT EXISTS idx_clients_default_billing_entity_id ON public."clients" ("default_billing_entity_id");
CREATE INDEX IF NOT EXISTS idx_clients_default_cost_centre_code ON public."clients" ("default_cost_centre_code");
CREATE INDEX IF NOT EXISTS idx_clients_default_profit_centre_code ON public."clients" ("default_profit_centre_code");
CREATE INDEX IF NOT EXISTS idx_clients_primary_owner_id ON public."clients" ("primary_owner_id");
CREATE INDEX IF NOT EXISTS idx_compliance_calendar_events_deleted_by ON public."compliance_calendar_events" ("deleted_by");
CREATE INDEX IF NOT EXISTS idx_dsc_records_created_by ON public."dsc_records" ("created_by");
CREATE INDEX IF NOT EXISTS idx_dsc_records_updated_by ON public."dsc_records" ("updated_by");
CREATE INDEX IF NOT EXISTS idx_leave_requests_reviewed_by ON public."leave_requests" ("reviewed_by");
CREATE INDEX IF NOT EXISTS idx_permission_requests_reviewed_by ON public."permission_requests" ("reviewed_by");
CREATE INDEX IF NOT EXISTS idx_staff_capabilities_granted_by ON public."staff_capabilities" ("granted_by");
CREATE INDEX IF NOT EXISTS idx_staff_capabilities_revoked_by ON public."staff_capabilities" ("revoked_by");
CREATE INDEX IF NOT EXISTS idx_staff_role_templates_created_by ON public."staff_role_templates" ("created_by");
CREATE INDEX IF NOT EXISTS idx_task_assignees_assigned_by ON public."task_assignees" ("assigned_by");
CREATE INDEX IF NOT EXISTS idx_task_custom_field_values_definition_id ON public."task_custom_field_values" ("definition_id");
CREATE INDEX IF NOT EXISTS idx_task_notes_created_by ON public."task_notes" ("created_by");
CREATE INDEX IF NOT EXISTS idx_task_steps_source_sop_step_id ON public."task_steps" ("source_sop_step_id");
CREATE INDEX IF NOT EXISTS idx_task_templates_default_assignee_id ON public."task_templates" ("default_assignee_id");
CREATE INDEX IF NOT EXISTS idx_task_templates_default_reviewer_id ON public."task_templates" ("default_reviewer_id");
CREATE INDEX IF NOT EXISTS idx_tasks_verified_by_user_id ON public."tasks" ("verified_by_user_id");
CREATE INDEX IF NOT EXISTS idx_user_billing_entity_access_billing_entity_id ON public."user_billing_entity_access" ("billing_entity_id");
CREATE INDEX IF NOT EXISTS idx_weekly_timesheet_submissions_approved_by ON public."weekly_timesheet_submissions" ("approved_by");

-- 3. Exact duplicate indexes (the first is kept, the rest dropped)
DROP INDEX IF EXISTS public."idx_task_activity_task_id";
DROP INDEX IF EXISTS public."idx_task_label_assignments_task_id";
DROP INDEX IF EXISTS public."idx_task_steps_task_id";
DROP INDEX IF EXISTS public."idx_tasks_assignee_status_due";
DROP INDEX IF EXISTS public."idx_tasks_client_status_deleted";
