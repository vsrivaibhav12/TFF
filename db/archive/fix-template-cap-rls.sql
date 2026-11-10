-- ============================================================================
-- FIX: Missing RLS SELECT policy on staff_role_template_capabilities
-- ============================================================================
-- Problem: team members could not read their active role template's capabilities,
-- so hasCapability() and listEffectiveCapabilities() returned empty for all
-- template-derived rights. This caused the nav bar to hide items the user
-- should have been able to see (e.g. credentials, dsc, services, notices,
-- hearings, work-done).
--
-- Run: npx tsx scripts/apply-fix-template-cap-rls.ts
-- ============================================================================

DROP POLICY IF EXISTS "role_template_caps_read_all" ON staff_role_template_capabilities;
CREATE POLICY "role_template_caps_read_all" ON staff_role_template_capabilities
  FOR SELECT TO authenticated
  USING (TRUE);
