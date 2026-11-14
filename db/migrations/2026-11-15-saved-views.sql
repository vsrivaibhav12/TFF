-- Saved views: a named set of filters plus a table layout (column order, hidden columns, density).
-- Every signed-in staff member can save their own views and can choose to share one with everyone.
--
-- The query is the page's URL filters, stored as a query string and cleaned by the app before saving.
-- The layout is a small JSON object the app also validates.
--
-- Additive and safe to run more than once. Apply before deploying the code that reads this table.

begin;

create table if not exists public.saved_views (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.users_profile(id) on delete cascade,
  scope       text not null check (scope in ('tasks')),
  name        text not null check (char_length(name) between 1 and 60),
  query       text not null default '' check (char_length(query) <= 1000),
  layout      jsonb not null default '{}'::jsonb,
  is_shared   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, scope, name)
);

create index if not exists idx_saved_views_scope_owner on public.saved_views (scope, owner_id);
create index if not exists idx_saved_views_shared on public.saved_views (scope) where is_shared;

alter table public.saved_views enable row level security;

revoke all on table public.saved_views from anon, public;
grant select, insert, update, delete on table public.saved_views to authenticated;
grant all on table public.saved_views to service_role;

-- Read: your own views, and views shared with everyone. Only staff have access.
drop policy if exists saved_views_read on public.saved_views;
create policy saved_views_read on public.saved_views for select to authenticated
  using (
    public.current_user_role() in ('admin', 'team')
    and (owner_id = (select auth.uid()) or is_shared)
  );

-- Write: only your own views. An admin can also remove anyone's view, for example a stale shared one.
drop policy if exists saved_views_insert on public.saved_views;
create policy saved_views_insert on public.saved_views for insert to authenticated
  with check (public.current_user_role() in ('admin', 'team') and owner_id = (select auth.uid()));

drop policy if exists saved_views_update on public.saved_views;
create policy saved_views_update on public.saved_views for update to authenticated
  using (public.current_user_role() in ('admin', 'team') and owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists saved_views_delete on public.saved_views;
create policy saved_views_delete on public.saved_views for delete to authenticated
  using (
    public.current_user_role() in ('admin', 'team')
    and (owner_id = (select auth.uid()) or public.current_user_role() = 'admin')
  );

commit;
