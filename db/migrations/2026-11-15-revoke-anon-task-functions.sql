-- Signed-out visitors can run four task functions. They run with the caller's rights and anonymous visitors
-- have no access to any table, so they return nothing today, but a visitor has no reason to call them at all.
-- Only signed-in users and the service role keep execute. Same fix as 2026-11-14-tighten-anon-access.sql.
--
-- Safe to run more than once.

begin;

revoke execute on function public.count_tasks_by_status(uuid, uuid) from public, anon;
revoke execute on function public.get_task_closure_velocity(integer) from public, anon;
revoke execute on function public.list_workdone_summary(date, date) from public, anon;
revoke execute on function public.search_task_ids(text, text[]) from public, anon;

grant execute on function public.count_tasks_by_status(uuid, uuid) to authenticated, service_role;
grant execute on function public.get_task_closure_velocity(integer) to authenticated, service_role;
grant execute on function public.list_workdone_summary(date, date) to authenticated, service_role;
grant execute on function public.search_task_ids(text, text[]) to authenticated, service_role;

commit;
