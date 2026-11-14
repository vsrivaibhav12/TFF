-- Make the saved_views policies cheaper. current_user_role() reads users_profile; written as a bare call it can run
-- once per row, and the tasks page asks for saved views on every load. Wrapping it in a sub-select lets Postgres
-- evaluate it once per statement. The rules themselves are unchanged.
--
-- Safe to run more than once.

begin;

drop policy if exists saved_views_read on public.saved_views;
create policy saved_views_read on public.saved_views for select to authenticated
  using (
    (select public.current_user_role()) in ('admin', 'team')
    and (owner_id = (select auth.uid()) or is_shared)
  );

drop policy if exists saved_views_insert on public.saved_views;
create policy saved_views_insert on public.saved_views for insert to authenticated
  with check ((select public.current_user_role()) in ('admin', 'team') and owner_id = (select auth.uid()));

drop policy if exists saved_views_update on public.saved_views;
create policy saved_views_update on public.saved_views for update to authenticated
  using ((select public.current_user_role()) in ('admin', 'team') and owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists saved_views_delete on public.saved_views;
create policy saved_views_delete on public.saved_views for delete to authenticated
  using (
    (select public.current_user_role()) in ('admin', 'team')
    and (owner_id = (select auth.uid()) or (select public.current_user_role()) = 'admin')
  );

commit;
