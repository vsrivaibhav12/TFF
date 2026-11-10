-- ============================================================================
-- 2026-11-10  Security hardening (lower urgency, apply after the critical file)
--
-- * The anonymous (not signed-in) role had SELECT on every public table and
--   could run the role/capability helper functions. RLS currently blocks it,
--   but one missed policy would become a leak. Remove the grants.
-- * Three functions had a mutable search_path.
-- ============================================================================

-- Anonymous visitors never read these tables directly (login uses the Auth API).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- Helper functions used inside RLS policies run as the signed-in user.
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_capability(text) FROM anon;

-- Pin search_path so these cannot be hijacked by objects in another schema.
ALTER FUNCTION public.count_tasks_by_status(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.get_task_closure_velocity(integer) SET search_path = public;
ALTER FUNCTION public.list_workdone_summary(date, date) SET search_path = public;
