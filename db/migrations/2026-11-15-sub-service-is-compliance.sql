-- Mark which sub-services are compliance items (GSTR-1, GSTR-3B, TDS, IT filing...) as opposed to
-- one-off work (registrations, incorporations, certificates).
--
-- The compliance dashboard and the compliance page read tasks whose sub-service has this flag set, so
-- every compliance task is tracked however it was created. This replaces the old compliance calendar
-- events, which were never filled in.
--
-- Existing sub-services start with the flag on when they repeat (they have a period) and off when they
-- do not. Change any of them in the Services screen afterwards.
--
-- Additive and safe to run more than once. Apply this before deploying the code that reads the column.

begin;

alter table public.sub_services
  add column if not exists is_compliance boolean not null default false;

update public.sub_services
   set is_compliance = true
 where period_type in ('monthly', 'quarterly', 'half_yearly', 'yearly', 'gst_frequency')
   and is_compliance = false;

create index if not exists idx_sub_services_is_compliance
  on public.sub_services (id) where is_compliance;

commit;
