-- Uniform periods (phase 2).
--
-- Every sub-service declares what kind of period its tasks use, and every task stores its
-- period as a canonical key ("2026-10", "FY2026-27-Q2", "FY2026-27-H1", "FY2026-27").
-- See lib/periods.ts for the rules. Quarters are fiscal (Q1 = Apr-Jun) and, for quarterly,
-- half-yearly and yearly periods, period_year holds the financial-year START year.
--
-- Apply this BEFORE deploying the code that reads these columns:
--   npm run db:apply-migration db/migrations/2026-11-13-period-types.sql
--
-- Safe to re-run. Nothing is rewritten or deleted: existing quarterly and yearly tasks keep
-- their stored values and have no key until an admin corrects them (see the period review page).

-- 1. Sub-service period type -------------------------------------------------------------
alter table public.sub_services
  add column if not exists period_type text;

-- Backfill from the schedule frequency. Admins review the result in Services.
update public.sub_services
set period_type = case frequency
  when 'monthly' then 'monthly'
  when 'quarterly' then 'quarterly'
  when 'annually' then 'yearly'
  else 'none'
end
where period_type is null;

alter table public.sub_services alter column period_type set default 'none';
alter table public.sub_services alter column period_type set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sub_services_period_type_check'
  ) then
    alter table public.sub_services
      add constraint sub_services_period_type_check
      check (period_type in ('none', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'gst_frequency'));
  end if;
end $$;

-- 2. Task period type and key -------------------------------------------------------------
alter table public.tasks add column if not exists period_type text;
alter table public.tasks add column if not exists period_key text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_period_type_check'
  ) then
    alter table public.tasks
      add constraint tasks_period_type_check
      check (period_type is null or period_type in ('none', 'monthly', 'quarterly', 'half_yearly', 'yearly'));
  end if;
end $$;

-- Backfill monthly tasks only: a month and year are unambiguous. Quarterly and yearly tasks are
-- left without a key because older rows used calendar quarters and calendar years.
update public.tasks
set period_type = 'monthly',
    period_key = period_year::text || '-' || lpad(period_month::text, 2, '0')
where period_key is null
  and period_month is not null
  and period_year is not null
  and period_quarter is null;

-- 3. One active task per client, sub-service and period -------------------------------------
-- Covers quarterly, half-yearly and yearly tasks too (the older month-only index stays).
do $$
declare
  dupes integer;
begin
  select count(*) into dupes from (
    select client_id, sub_service_id, period_key
    from public.tasks
    where is_deleted = false and period_key is not null
    group by client_id, sub_service_id, period_key
    having count(*) > 1
  ) d;
  if dupes > 0 then
    raise exception 'Cannot add the period key index: % client, sub-service and period combinations have more than one active task. Resolve them first.', dupes;
  end if;
end $$;

create unique index if not exists uniq_active_task_period_key
  on public.tasks (client_id, sub_service_id, period_key)
  where is_deleted = false and period_key is not null;
