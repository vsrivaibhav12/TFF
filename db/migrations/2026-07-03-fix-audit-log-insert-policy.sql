-- Fix: authenticated users must be able to insert their own audit rows.
-- Prior policy only allowed admin SELECT and required service-role for INSERT,
-- but application code uses the regular server client for writeAudit().
ALTER TABLE public.global_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_auth_insert ON public.global_audit_log;
CREATE POLICY audit_auth_insert ON public.global_audit_log FOR INSERT TO authenticated
  WITH CHECK (performed_by = auth.uid());
