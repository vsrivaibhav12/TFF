-- Close two small gaps found in the 2026-11-14 database audit. Nothing here changes what a signed-in
-- user can do.
--
-- 1. Three functions that run with elevated rights could be called by signed-out visitors. They return
--    nothing useful without a login, but a signed-out visitor has no reason to call them. Only signed-in
--    users (and the service role) keep execute. The guard function is a trigger function, so it is never
--    called directly and needs no grant at all.
--
-- 2. Six row level security policies were written for the broad "public" role instead of "authenticated".
--    Each already checks the signed-in user, so a visitor saw nothing, but the policy should say who it is for.
--    ALTER POLICY changes only the role list; the conditions stay exactly as they are.
--
-- Safe to run more than once.

begin;

-- 1. Functions: remove execute from signed-out visitors.
revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.user_has_capability(text) from public, anon;
revoke execute on function public.guard_users_profile_privileged_columns() from public, anon;

grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.user_has_capability(text) to authenticated, service_role;

-- 2. Policies: authenticated users only.
alter policy attendance_direct_reports on public.attendance_logs to authenticated;
alter policy attendance_own_view on public.attendance_logs to authenticated;
alter policy weekly_ts_insert_own on public.weekly_timesheet_submissions to authenticated;
alter policy weekly_ts_select_manager on public.weekly_timesheet_submissions to authenticated;
alter policy weekly_ts_select_own on public.weekly_timesheet_submissions to authenticated;
alter policy weekly_ts_update_manager on public.weekly_timesheet_submissions to authenticated;

commit;

-- Check afterwards (both should return no rows):
--   select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'EXECUTE');
--   select tablename, policyname from pg_policies where schemaname = 'public' and roles::text like '%public%';
