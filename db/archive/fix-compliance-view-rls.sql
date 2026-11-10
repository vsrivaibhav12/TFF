-- ============================================================================
-- FIX: Add compliance.view to compliance table SELECT policies
-- ============================================================================
-- The compliance tables (gst_filings, tds_filings, it_filings, compliance_status)
-- only allowed SELECT for client-assigned users OR users with compliance.enter.
-- This meant users with compliance.view (read-only) were blocked at RLS.
-- ============================================================================

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
