-- One query for the task list's six view tabs (Open, Overdue, Due today, Due this week, Waiting on client,
-- Unassigned). The page used to run six separate count queries, one per tab, on every load.
--
-- Each count keeps the filters the person has applied (client, priority, period, billing, stuck, verified,
-- sub-service, assignee) and replaces the status and due-date scope with the tab's own, the same rules as
-- lib/tasks/tiles.ts:
--   open         pending or in progress
--   overdue      open and due on or before yesterday
--   today        open and due today
--   week         open and due from today to p_week_end
--   waiting      open and blocked on the client
--   unassigned   open and with no owner (ignores the assignee filter)
--
-- SECURITY INVOKER, so row level security applies exactly as it does for the list itself. The app falls back to
-- the six separate counts if this function is missing or a text or label search is on.
--
-- Safe to run more than once.

create or replace function public.task_tab_counts(
  p_today         date,
  p_week_end      date,
  p_client        uuid    default null,
  p_sub_services  uuid[]  default null,
  p_period_year   integer default null,
  p_period_month  integer default null,
  p_is_billable   boolean default null,
  p_is_stuck      boolean default null,
  p_is_verified   boolean default null,
  p_priority      text[]  default null,
  p_assigned      text    default null
)
returns table (
  open_count       bigint,
  overdue_count    bigint,
  today_count      bigint,
  week_count       bigint,
  waiting_count    bigint,
  unassigned_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with scoped as (
    select t.status, t.due_date, t.assigned_to, t.is_blocked_on_client,
           (p_assigned is null
             or (p_assigned = 'unassigned' and t.assigned_to is null)
             or t.assigned_to::text = p_assigned) as assigned_ok
      from tasks t
     where t.is_deleted = false
       and t.status in ('pending', 'in_progress')
       and (p_client is null or t.client_id = p_client)
       and (p_sub_services is null or t.sub_service_id = any (p_sub_services))
       and (p_period_year is null or t.period_year = p_period_year)
       and (p_period_month is null or t.period_month = p_period_month)
       and (p_is_billable is null or t.is_billable = p_is_billable)
       and (p_is_stuck is null or t.is_stuck = p_is_stuck)
       and (p_is_verified is null or t.is_verified = p_is_verified)
       and (p_priority is null or cardinality(p_priority) = 0 or t.priority = any (p_priority))
  )
  select
    count(*) filter (where assigned_ok),
    count(*) filter (where assigned_ok and due_date <= p_today - 1),
    count(*) filter (where assigned_ok and due_date = p_today),
    count(*) filter (where assigned_ok and due_date >= p_today and due_date <= p_week_end),
    count(*) filter (where assigned_ok and is_blocked_on_client),
    count(*) filter (where assigned_to is null)
  from scoped;
$$;

revoke all on function public.task_tab_counts(date, date, uuid, uuid[], integer, integer, boolean, boolean, boolean, text[], text) from public, anon;
grant execute on function public.task_tab_counts(date, date, uuid, uuid[], integer, integer, boolean, boolean, boolean, text[], text) to authenticated, service_role;
