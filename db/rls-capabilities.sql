-- ============================================================================
-- RLS CAPABILITIES MIGRATION — 2026-05-29
-- Makes staff_capabilities actually expand access beyond team_client_assignment.
-- Run via: npx tsx scripts/apply-rls-capabilities.ts
-- ============================================================================

-- Helper: check whether the calling user has an active capability grant.
-- SECURITY DEFINER so it can read staff_capabilities regardless of the table's
-- own RLS policies.
-- Defensive: returns FALSE if staff_capabilities does not yet exist (fresh installs).
CREATE OR REPLACE FUNCTION public.user_has_capability(cap TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_template_id UUID;
BEGIN
  IF to_regclass('public.staff_capabilities') IS NULL THEN
    RETURN FALSE;
  END IF;

  v_user_id := auth.uid();

  -- 1. Explicit deviation (grant or revoke)
  IF EXISTS (
    SELECT 1 FROM staff_capabilities
    WHERE user_id = v_user_id
      AND capability = cap
      AND revoked_at IS NULL
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM staff_capabilities
    WHERE user_id = v_user_id
      AND capability = cap
      AND revoked_at IS NOT NULL
  ) THEN
    RETURN FALSE;
  END IF;

  -- 2. Fallback to active role template
  SELECT active_role_template_id INTO v_template_id
  FROM users_profile
  WHERE id = v_user_id;

  IF v_template_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM staff_role_template_capabilities
      WHERE template_id = v_template_id
        AND capability = cap
    );
  END IF;

  RETURN FALSE;
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_capability(TEXT) TO anon, authenticated, service_role;

-- ============================================================================
-- CLIENTS
-- ============================================================================

-- SELECT: team sees assigned clients OR anyone with clients.read.all
DROP POLICY IF EXISTS "clients_team_select" ON clients;
CREATE POLICY "clients_team_select" ON clients
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('clients.read.all')
    )
  );

-- UPDATE: team can update assigned clients OR anyone with clients.edit
DROP POLICY IF EXISTS "clients_team_update" ON clients;
CREATE POLICY "clients_team_update" ON clients
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('clients.edit')
      OR public.user_has_capability('clients.toggle_portal')
    )
  );

-- INSERT: team with clients.create
DROP POLICY IF EXISTS "clients_team_insert" ON clients;
CREATE POLICY "clients_team_insert" ON clients
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.create')
  );

-- DELETE: team with clients.delete
DROP POLICY IF EXISTS "clients_team_delete" ON clients;
CREATE POLICY "clients_team_delete" ON clients
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.delete')
  );

-- ============================================================================
-- TEAM CLIENT ASSIGNMENT
-- ============================================================================

-- Admin write + team read (existing). Add team write for clients.assign_team.
DROP POLICY IF EXISTS "tca_team_write" ON team_client_assignment;
CREATE POLICY "tca_team_write" ON team_client_assignment
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.assign_team')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.assign_team')
  );

-- ============================================================================
-- TASKS
-- ============================================================================

-- Team SELECT: assigned client OR assigned task OR task capabilities
DROP POLICY IF EXISTS "tasks_team_view" ON tasks;
CREATE POLICY "tasks_team_view" ON tasks
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR assigned_to = auth.uid()
      OR reviewer_id = auth.uid()
      OR public.user_has_capability('tasks.view')
      OR public.user_has_capability('tasks.assign')
      OR public.user_has_capability('tasks.complete')
      OR public.user_has_capability('tasks.create')
      OR public.user_has_capability('tasks.edit')
    )
  );

-- Team INSERT: assigned client OR tasks.create / tasks.assign
DROP POLICY IF EXISTS "tasks_team_insert" ON tasks;
CREATE POLICY "tasks_team_insert" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('tasks.create')
      OR public.user_has_capability('tasks.assign')
    )
  );

-- Team UPDATE: own/assigned OR tasks.edit
DROP POLICY IF EXISTS "tasks_team_update_own" ON tasks;
CREATE POLICY "tasks_team_update_own" ON tasks
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR assigned_to = auth.uid()
      OR reviewer_id = auth.uid()
      OR public.user_has_capability('tasks.edit')
    )
  );

-- Team DELETE: tasks.delete
DROP POLICY IF EXISTS "tasks_team_delete" ON tasks;
CREATE POLICY "tasks_team_delete" ON tasks
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('tasks.delete')
  );

-- ============================================================================
-- TASK STEPS (schema-additions)
-- ============================================================================

DROP POLICY IF EXISTS "task_steps_team" ON task_steps;
CREATE POLICY "task_steps_team" ON task_steps
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      task_id IN (
        SELECT id FROM tasks WHERE client_id IN (
          SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
        )
      )
      OR public.user_has_capability('tasks.assign')
      OR public.user_has_capability('tasks.complete')
      OR public.user_has_capability('tasks.create')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      task_id IN (
        SELECT id FROM tasks WHERE client_id IN (
          SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
        )
      )
      OR public.user_has_capability('tasks.assign')
      OR public.user_has_capability('tasks.complete')
      OR public.user_has_capability('tasks.create')
    )
  );

-- ============================================================================
-- QUERIES
-- ============================================================================

-- Team ALL: assigned client OR queries.assign
DROP POLICY IF EXISTS "queries_team_view" ON queries;
DROP POLICY IF EXISTS "queries_team_assigned" ON queries;
DROP POLICY IF EXISTS "queries_team_all" ON queries;
CREATE POLICY "queries_team_all" ON queries
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('queries.assign')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('queries.assign')
    )
  );

-- ============================================================================
-- NOTICES
-- ============================================================================

-- Broad team SELECT is already granted by notices_admin_team_select (rls-additive.sql).
-- We only add the mutate capability here.
DROP POLICY IF EXISTS "notices_team_mutate" ON notices;
CREATE POLICY "notices_team_mutate" ON notices
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('notices.manage')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('notices.manage')
  );

-- ============================================================================
-- HEARINGS
-- ============================================================================

-- Team ALL: hearings.manage
DROP POLICY IF EXISTS "hearings_team_mutate" ON hearings;
CREATE POLICY "hearings_team_mutate" ON hearings
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('hearings.manage')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('hearings.manage')
  );

-- ============================================================================
-- CREDENTIALS
-- ============================================================================

-- Team SELECT: assigned OR credentials.manage
DROP POLICY IF EXISTS "credentials_team_only" ON credentials;
DROP POLICY IF EXISTS "credentials_team_select" ON credentials;
CREATE POLICY "credentials_team_select" ON credentials
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('credentials.manage')
    )
  );

-- Team INSERT: assigned OR credentials.manage
DROP POLICY IF EXISTS "credentials_team_insert" ON credentials;
CREATE POLICY "credentials_team_insert" ON credentials
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('credentials.manage')
    )
  );

-- Team UPDATE: assigned OR credentials.manage
DROP POLICY IF EXISTS "credentials_team_update" ON credentials;
CREATE POLICY "credentials_team_update" ON credentials
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('credentials.manage')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('credentials.manage')
    )
  );

-- ============================================================================
-- DSC RECORDS
-- ============================================================================

-- Team SELECT: assigned OR dsc.manage
DROP POLICY IF EXISTS "dsc_records_team_only" ON dsc_records;
DROP POLICY IF EXISTS "dsc_records_team_select" ON dsc_records;
CREATE POLICY "dsc_records_team_select" ON dsc_records
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('dsc.manage')
    )
  );

-- Team INSERT: assigned OR dsc.manage
DROP POLICY IF EXISTS "dsc_records_team_insert" ON dsc_records;
CREATE POLICY "dsc_records_team_insert" ON dsc_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('dsc.manage')
    )
  );

-- Team UPDATE: assigned OR dsc.manage
DROP POLICY IF EXISTS "dsc_records_team_update" ON dsc_records;
CREATE POLICY "dsc_records_team_update" ON dsc_records
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('dsc.manage')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('dsc.manage')
    )
  );

-- ============================================================================
-- COMPLIANCE (GST / TDS / IT / compliance_status)
-- ============================================================================

-- GST filings
DROP POLICY IF EXISTS "gst_filings_team_only" ON gst_filings;
DROP POLICY IF EXISTS "gst_filings_team_select" ON gst_filings;
CREATE POLICY "gst_filings_team_select" ON gst_filings
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.view')
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "gst_filings_team_insert" ON gst_filings;
CREATE POLICY "gst_filings_team_insert" ON gst_filings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "gst_filings_team_update" ON gst_filings;
CREATE POLICY "gst_filings_team_update" ON gst_filings
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

-- TDS filings
DROP POLICY IF EXISTS "tds_filings_team_only" ON tds_filings;
DROP POLICY IF EXISTS "tds_filings_team_select" ON tds_filings;
CREATE POLICY "tds_filings_team_select" ON tds_filings
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.view')
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "tds_filings_team_insert" ON tds_filings;
CREATE POLICY "tds_filings_team_insert" ON tds_filings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "tds_filings_team_update" ON tds_filings;
CREATE POLICY "tds_filings_team_update" ON tds_filings
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

-- IT filings
DROP POLICY IF EXISTS "it_filings_team_only" ON it_filings;
DROP POLICY IF EXISTS "it_filings_team_select" ON it_filings;
CREATE POLICY "it_filings_team_select" ON it_filings
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.view')
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "it_filings_team_insert" ON it_filings;
CREATE POLICY "it_filings_team_insert" ON it_filings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "it_filings_team_update" ON it_filings;
CREATE POLICY "it_filings_team_update" ON it_filings
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

-- Compliance status
DROP POLICY IF EXISTS "compliance_status_team_only" ON compliance_status;
DROP POLICY IF EXISTS "compliance_status_team_select" ON compliance_status;
CREATE POLICY "compliance_status_team_select" ON compliance_status
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.view')
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "compliance_status_team_update" ON compliance_status;
CREATE POLICY "compliance_status_team_update" ON compliance_status
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

-- ============================================================================
-- FINANCIAL DATA (BizLens / vCFO)
-- ============================================================================

-- GST data entries
DROP POLICY IF EXISTS "gst_data_entries_team_only" ON gst_data_entries;
DROP POLICY IF EXISTS "gst_data_entries_team_select" ON gst_data_entries;
CREATE POLICY "gst_data_entries_team_select" ON gst_data_entries
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  );

DROP POLICY IF EXISTS "gst_data_entries_team_insert" ON gst_data_entries;
CREATE POLICY "gst_data_entries_team_insert" ON gst_data_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  );

DROP POLICY IF EXISTS "gst_data_entries_team_update" ON gst_data_entries;
CREATE POLICY "gst_data_entries_team_update" ON gst_data_entries
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  );

-- Financial data
DROP POLICY IF EXISTS "financial_data_team_only" ON financial_data;
DROP POLICY IF EXISTS "financial_data_team_select" ON financial_data;
CREATE POLICY "financial_data_team_select" ON financial_data
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  );

DROP POLICY IF EXISTS "financial_data_team_insert" ON financial_data;
CREATE POLICY "financial_data_team_insert" ON financial_data
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  );

DROP POLICY IF EXISTS "financial_data_team_update" ON financial_data;
CREATE POLICY "financial_data_team_update" ON financial_data
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  );

-- vCFO snapshots
DROP POLICY IF EXISTS "vcfo_snapshots_team_view" ON vcfo_snapshots;
DROP POLICY IF EXISTS "vcfo_snapshots_team_select" ON vcfo_snapshots;
CREATE POLICY "vcfo_snapshots_team_select" ON vcfo_snapshots
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('vcfo.enter')
    )
  );

DROP POLICY IF EXISTS "vcfo_snapshots_team_insert" ON vcfo_snapshots;
CREATE POLICY "vcfo_snapshots_team_insert" ON vcfo_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('vcfo.enter')
    )
  );

DROP POLICY IF EXISTS "vcfo_snapshots_team_update" ON vcfo_snapshots;
CREATE POLICY "vcfo_snapshots_team_update" ON vcfo_snapshots
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('vcfo.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('vcfo.enter')
    )
  );

-- ============================================================================
-- SOLUTION LOG
-- ============================================================================

DROP POLICY IF EXISTS "solution_log_team_view" ON solution_log;
DROP POLICY IF EXISTS "solution_log_team_select" ON solution_log;
CREATE POLICY "solution_log_team_select" ON solution_log
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('manage_solution_log')
    )
  );

DROP POLICY IF EXISTS "solution_log_team_insert" ON solution_log;
CREATE POLICY "solution_log_team_insert" ON solution_log
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('manage_solution_log')
    )
  );

DROP POLICY IF EXISTS "solution_log_team_update" ON solution_log;
CREATE POLICY "solution_log_team_update" ON solution_log
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('manage_solution_log')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('manage_solution_log')
    )
  );

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

DROP POLICY IF EXISTS "documents_team_view" ON documents;
DROP POLICY IF EXISTS "documents_team_select" ON documents;
CREATE POLICY "documents_team_select" ON documents
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND visible_to_team = TRUE
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('clients.read.all')
    )
  );

-- ============================================================================
-- CLIENT COMMUNICATION LOG
-- ============================================================================

DROP POLICY IF EXISTS "communication_log_team_view" ON client_communication_log;
DROP POLICY IF EXISTS "communication_log_team_select" ON client_communication_log;
CREATE POLICY "communication_log_team_select" ON client_communication_log
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('clients.read.all')
    )
  );

-- ============================================================================
-- CLIENT PORTAL VISIBILITY
-- ============================================================================

DROP POLICY IF EXISTS "cpv_team_read" ON client_portal_visibility;
CREATE POLICY "cpv_team_read" ON client_portal_visibility
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('team', 'admin')
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('clients.read.all')
      OR public.user_has_capability('clients.toggle_portal')
    )
  );

-- ============================================================================
-- SERVICE CATALOGUE
-- ============================================================================

-- services: team with services.manage can mutate
DROP POLICY IF EXISTS "services_team_mutate" ON services;
CREATE POLICY "services_team_mutate" ON services
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.manage')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.manage')
  );

-- sub_services: team with services.manage can mutate
DROP POLICY IF EXISTS "sub_services_team_mutate" ON sub_services;
CREATE POLICY "sub_services_team_mutate" ON sub_services
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.manage')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.manage')
  );

-- ============================================================================
-- CLIENT SERVICES & SUB-SERVICES
-- ============================================================================

-- client_services: team with services.assign can write
DROP POLICY IF EXISTS "client_services_team_write" ON client_services;
CREATE POLICY "client_services_team_write" ON client_services
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.assign')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.assign')
  );

-- client_sub_services: team with services.assign can write
DROP POLICY IF EXISTS "client_sub_services_team_write" ON client_sub_services;
CREATE POLICY "client_sub_services_team_write" ON client_sub_services
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.assign')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.assign')
  );

-- ============================================================================
-- STAFF MANAGEMENT
-- ============================================================================

-- users_profile: team with staff.manage can mutate (except prime admins)
DROP POLICY IF EXISTS "users_profile_team_manage" ON users_profile;
CREATE POLICY "users_profile_team_manage" ON users_profile
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('staff.manage')
    AND is_prime_admin = FALSE
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('staff.manage')
    AND is_prime_admin = FALSE
  );

-- staff_capabilities: team with staff.grant_capabilities can mutate
DROP POLICY IF EXISTS "staff_caps_team_grant" ON staff_capabilities;
CREATE POLICY "staff_caps_team_grant" ON staff_capabilities
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('staff.grant_capabilities')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('staff.grant_capabilities')
  );

-- ============================================================================
-- PAYROLL
-- ============================================================================

-- payroll_runs: team with payroll.run can manage
DROP POLICY IF EXISTS "payroll_runs_team_mutate" ON payroll_runs;
CREATE POLICY "payroll_runs_team_mutate" ON payroll_runs
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('payroll.run')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('payroll.run')
  );

-- payroll_adjustments: team with payroll.run can manage
DROP POLICY IF EXISTS "payroll_adj_team_mutate" ON payroll_adjustments;
CREATE POLICY "payroll_adj_team_mutate" ON payroll_adjustments
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('payroll.run')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('payroll.run')
  );

-- ============================================================================
-- LEAVE & ATTENDANCE
-- ============================================================================

-- leave_requests: team with leave.approve can manage all
DROP POLICY IF EXISTS "leave_requests_team_approve" ON leave_requests;
CREATE POLICY "leave_requests_team_approve" ON leave_requests
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('leave.approve')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('leave.approve')
  );

-- attendance_logs: team with attendance.approve can manage all
DROP POLICY IF EXISTS "attendance_logs_team_approve" ON attendance_logs;
CREATE POLICY "attendance_logs_team_approve" ON attendance_logs
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('attendance.approve')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('attendance.approve')
  );

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

-- global_audit_log: team with audit.view can read
DROP POLICY IF EXISTS "audit_log_team_view" ON global_audit_log;
CREATE POLICY "audit_log_team_view" ON global_audit_log
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('audit.view')
  );

-- ============================================================================
-- COMPLIANCE INSIGHTS
-- ============================================================================

-- compliance_insights: team with insights.configure can mutate
DROP POLICY IF EXISTS "compliance_insights_team_mutate" ON compliance_insights;
CREATE POLICY "compliance_insights_team_mutate" ON compliance_insights
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('insights.configure')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('insights.configure')
  );

-- ============================================================================
-- VENDORS
-- ============================================================================

-- vendors: team with clients.read.all can read all (vendors are client-linked)
DROP POLICY IF EXISTS "vendors_team_read" ON vendors;
CREATE POLICY "vendors_team_read" ON vendors
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.read.all')
  );

-- ============================================================================
-- ENGAGEMENT LETTERS & LIFECYCLE
-- ============================================================================

-- engagement_letters: team with clients.read.all can read all
DROP POLICY IF EXISTS "engagement_letters_team_read" ON engagement_letters;
CREATE POLICY "engagement_letters_team_read" ON engagement_letters
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.read.all')
  );

-- client_lifecycle_stage: team with clients.read.all can read all
DROP POLICY IF EXISTS "client_lifecycle_team_read" ON client_lifecycle_stage;
CREATE POLICY "client_lifecycle_team_read" ON client_lifecycle_stage
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.read.all')
  );

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- ============================================================================
-- v2 VIEW CAPABILITIES (2026-06-04)
-- Adds read-only SELECT policies for the new *.view capabilities so that
-- modules can be exposed in the team nav without also granting write access.
-- ============================================================================

-- NOTICES: team with notices.view can read notices
DROP POLICY IF EXISTS "notices_team_view_select" ON notices;
CREATE POLICY "notices_team_view_select" ON notices
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('notices.view')
  );

-- HEARINGS: team with hearings.view can read hearings
DROP POLICY IF EXISTS "hearings_team_view_select" ON hearings;
CREATE POLICY "hearings_team_view_select" ON hearings
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('hearings.view')
  );

-- BIZLENS DATA: team with bizlens.view can read
DROP POLICY IF EXISTS "bizlens_data_team_view_select" ON bizlens_data;
CREATE POLICY "bizlens_data_team_view_select" ON bizlens_data
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('bizlens.view')
  );

-- VCFO SNAPSHOTS: team with vcfo.view can read
DROP POLICY IF EXISTS "vcfo_snapshots_team_view_select" ON vcfo_snapshots;
CREATE POLICY "vcfo_snapshots_team_view_select" ON vcfo_snapshots
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('vcfo.view')
  );

-- DSC: team with dsc.view can read
DROP POLICY IF EXISTS "dsc_records_team_view_select" ON dsc_records;
CREATE POLICY "dsc_records_team_view_select" ON dsc_records
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('dsc.view')
  );

-- CREDENTIALS: team with credentials.view can read
DROP POLICY IF EXISTS "credentials_team_view_select" ON credentials;
CREATE POLICY "credentials_team_view_select" ON credentials
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('credentials.view')
  );

-- PAYROLL RUNS: team with payroll.view can read
DROP POLICY IF EXISTS "payroll_runs_team_view_select" ON payroll_runs;
CREATE POLICY "payroll_runs_team_view_select" ON payroll_runs
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('payroll.view')
  );

-- QUERIES: team with queries.view can read
DROP POLICY IF EXISTS "queries_team_view_select" ON queries;
CREATE POLICY "queries_team_view_select" ON queries
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('queries.view')
  );

-- SERVICES: team with services.view can read
DROP POLICY IF EXISTS "services_team_view_select" ON services;
CREATE POLICY "services_team_view_select" ON services
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.view')
  );

-- SUB SERVICES: team with services.view can read
DROP POLICY IF EXISTS "sub_services_team_view_select" ON sub_services;
CREATE POLICY "sub_services_team_view_select" ON sub_services
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.view')
  );

-- DOCUMENTS: team with documents.view can read
DROP POLICY IF EXISTS "documents_team_view_select" ON documents;
CREATE POLICY "documents_team_view_select" ON documents
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('documents.view')
  );

-- COMPLIANCE INSIGHTS: team with insights.view can read
DROP POLICY IF EXISTS "insights_team_view_select" ON compliance_insights;
CREATE POLICY "insights_team_view_select" ON compliance_insights
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('insights.view')
  );

-- ============================================================================
-- WORK DONE (task_workdone)
-- ============================================================================

-- Team with workdone.manage can mutate any row
DROP POLICY IF EXISTS "task_workdone_team_manage" ON task_workdone;
CREATE POLICY "task_workdone_team_manage" ON task_workdone
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('workdone.manage')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('workdone.manage')
  );

-- ============================================================================
-- ROLE TEMPLATE CAPABILITIES (staff_role_template_capabilities)
-- ============================================================================

-- All authenticated users must be able to read template capabilities so that
-- team members can resolve their effective capability set (template + deviations).
-- Template definitions themselves are not sensitive data.
DROP POLICY IF EXISTS "role_template_caps_read_all" ON staff_role_template_capabilities;
CREATE POLICY "role_template_caps_read_all" ON staff_role_template_capabilities
  FOR SELECT TO authenticated
  USING (TRUE);
