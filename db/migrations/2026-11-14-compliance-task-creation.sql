-- Compliance-driven task creation (phase 3).
--
-- 1. compliance_calendar_events gets a canonical period_key so a created task can be linked to
--    its calendar event, whatever label the event was generated with.
-- 2. client_sub_services gets a default assignee, used to pre-fill the create screen.
-- 3. compliance_deadlines records a due date that was changed (for example a government extension).
-- 4. Two functions let admins, and team members who hold compliance.generate_tasks, list the
--    linked clients of a deadline and create their tasks, without needing wider access to
--    clients or tasks. Both check the caller inside the function.
--
-- Apply AFTER 2026-11-13-period-types.sql and BEFORE deploying the code that uses it:
--   npm run db:apply-migration db/migrations/2026-11-14-compliance-task-creation.sql
--
-- Safe to re-run. Run `npm run db:rls-test` afterwards.

-- 1. Event period keys ------------------------------------------------------------------------
alter table public.compliance_calendar_events add column if not exists period_key text;

-- Rule-driven events. Monthly labels look like "Oct 2026".
update public.compliance_calendar_events e
set period_key = to_char(to_date(e.period_label, 'Mon YYYY'), 'YYYY-MM')
from public.compliance_calendar_rules r
where e.period_key is null and e.rule_id = r.id and r.periodicity = 'monthly'
  and e.period_label ~ '^[A-Z][a-z]{2} [0-9]{4}$';

-- Half-yearly rule events are labelled with the first month of the half ("Apr 2026" or "Oct 2026").
update public.compliance_calendar_events e
set period_key = 'FY'
  || (case when extract(month from to_date(e.period_label, 'Mon YYYY')) >= 4
       then extract(year from to_date(e.period_label, 'Mon YYYY'))::int
       else extract(year from to_date(e.period_label, 'Mon YYYY'))::int - 1 end)::text
  || '-'
  || lpad((((case when extract(month from to_date(e.period_label, 'Mon YYYY')) >= 4
       then extract(year from to_date(e.period_label, 'Mon YYYY'))::int
       else extract(year from to_date(e.period_label, 'Mon YYYY'))::int - 1 end) + 1) % 100)::text, 2, '0')
  || '-H'
  || (case when extract(month from to_date(e.period_label, 'Mon YYYY')) between 4 and 9 then '1' else '2' end)
from public.compliance_calendar_rules r
where e.period_key is null and e.rule_id = r.id and r.periodicity = 'half_yearly'
  and e.period_label ~ '^[A-Z][a-z]{2} [0-9]{4}$';

-- Quarterly rule events: "Q2 2026-27" is the second fiscal quarter of FY 2026-27.
update public.compliance_calendar_events e
set period_key = 'FY' || substring(e.period_label from 4 for 4) || '-' || substring(e.period_label from 9 for 2)
  || '-Q' || substring(e.period_label from 2 for 1)
from public.compliance_calendar_rules r
where e.period_key is null and e.rule_id = r.id and r.periodicity = 'quarterly'
  and e.period_label ~ '^Q[1-4] [0-9]{4}-[0-9]{2}$';

-- Yearly events: "FY 2026-27".
update public.compliance_calendar_events e
set period_key = 'FY' || substring(e.period_label from 4 for 4) || '-' || substring(e.period_label from 9 for 2)
where e.period_key is null and e.period_label ~ '^FY [0-9]{4}-[0-9]{2}$';

-- Sub-service driven monthly events.
update public.compliance_calendar_events e
set period_key = to_char(to_date(e.period_label, 'Mon YYYY'), 'YYYY-MM')
from public.sub_services s
where e.period_key is null and e.rule_id is null and e.sub_service_id = s.id and s.frequency = 'monthly'
  and e.period_label ~ '^[A-Z][a-z]{2} [0-9]{4}$';

-- Sub-service driven quarterly events use CALENDAR quarters ("Q1 2026" = Jan-Mar 2026). Convert to the
-- fiscal quarter that covers the same months.
update public.compliance_calendar_events e
set period_key = 'FY'
  || (case when substring(e.period_label from 2 for 1)::int * 3 >= 4
       then substring(e.period_label from 4 for 4)::int else substring(e.period_label from 4 for 4)::int - 1 end)::text
  || '-'
  || lpad((((case when substring(e.period_label from 2 for 1)::int * 3 >= 4
       then substring(e.period_label from 4 for 4)::int else substring(e.period_label from 4 for 4)::int - 1 end) + 1) % 100)::text, 2, '0')
  || '-Q'
  || ((((substring(e.period_label from 2 for 1)::int * 3 - 4 + 12) % 12) / 3) + 1)::text
from public.sub_services s
where e.period_key is null and e.rule_id is null and e.sub_service_id = s.id and s.frequency = 'quarterly'
  and e.period_label ~ '^Q[1-4] [0-9]{4}$';

create index if not exists idx_cce_period_key on public.compliance_calendar_events (sub_service_id, period_key);

-- 2. Default assignee ------------------------------------------------------------------------
alter table public.client_sub_services
  add column if not exists default_assignee_id uuid references public.users_profile(id) on delete set null;

-- 3. Changed due dates -----------------------------------------------------------------------
create table if not exists public.compliance_deadlines (
  id uuid primary key default extensions.uuid_generate_v4(),
  sub_service_id uuid not null references public.sub_services(id) on delete cascade,
  period_key text not null,
  due_date date not null,
  original_due_date date,
  extension_note text,
  updated_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sub_service_id, period_key)
);

alter table public.compliance_deadlines enable row level security;

drop policy if exists compliance_deadlines_read on public.compliance_deadlines;
create policy compliance_deadlines_read on public.compliance_deadlines
  as permissive for select to authenticated
  using ((select current_user_role()) in ('admin', 'team'));

drop policy if exists compliance_deadlines_write on public.compliance_deadlines;
create policy compliance_deadlines_write on public.compliance_deadlines
  as permissive for all to authenticated
  using (
    (select current_user_role()) = 'admin'
    or ((select current_user_role()) = 'team' and (select user_has_capability('compliance.generate_tasks')))
  )
  with check (
    (select current_user_role()) = 'admin'
    or ((select current_user_role()) = 'team' and (select user_has_capability('compliance.generate_tasks')))
  );

-- 4. Functions for the create screen --------------------------------------------------------------

-- The linked clients of a deadline: who they are, their default assignee, their GST filing frequency
-- and compliance profile (to apply rule conditions), and any task they already have for the period.
create or replace function public.list_deadline_clients(p_sub_service_id uuid, p_period_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text := (select current_user_role());
begin
  if auth.uid() is null
     or not (v_role = 'admin' or (v_role = 'team' and user_has_capability('compliance.generate_tasks'))) then
    raise exception 'You do not have permission to create tasks from deadlines' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.business_name)
    from (
      select
        c.id as client_id,
        c.business_name,
        g.name as group_name,
        css.default_assignee_id,
        p.gst_filing_frequency,
        to_jsonb(p) as profile,
        (
          select t.id from public.tasks t
          where t.client_id = c.id
            and t.sub_service_id = p_sub_service_id
            and t.period_key = p_period_key
            and t.is_deleted = false
          limit 1
        ) as existing_task_id
      from public.client_sub_services css
      join public.clients c on c.id = css.client_id and c.is_deleted = false
      left join public.client_groups g on g.id = c.group_id
      left join public.client_compliance_profiles p on p.client_id = c.id
      where css.sub_service_id = p_sub_service_id
        and css.is_active is not false
    ) x
  ), '[]'::jsonb);
end;
$$;

-- Create one task per row. p_rows is [{ "client_id": uuid, "assigned_to": uuid, "title": text }].
-- Each row is checked and created on its own; a row that fails is reported and does not stop the rest.
create or replace function public.create_deadline_tasks(
  p_sub_service_id uuid,
  p_period_key text,
  p_period_type text,
  p_period_year integer,
  p_period_month integer,
  p_period_quarter integer,
  p_due_date date,
  p_priority text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := (select current_user_role());
  v_prefix text;
  v_max integer;
  v_billable boolean;
  r jsonb;
  v_client uuid;
  v_assignee uuid;
  v_title text;
  v_id uuid;
  v_num text;
  v_created jsonb := '[]'::jsonb;
  v_failed jsonb := '[]'::jsonb;
begin
  if v_uid is null
     or not (v_role = 'admin' or (v_role = 'team' and user_has_capability('compliance.generate_tasks'))) then
    raise exception 'You do not have permission to create tasks from deadlines' using errcode = '42501';
  end if;
  if p_priority is null or p_priority not in ('low', 'medium', 'high', 'urgent') then
    raise exception 'Invalid priority' using errcode = '22023';
  end if;
  if p_period_key is null or p_due_date is null or p_sub_service_id is null then
    raise exception 'A sub-service, period and due date are required' using errcode = '22023';
  end if;

  -- Task numbers are T-YY-NNNN. One caller at a time so two screens cannot take the same number.
  perform pg_advisory_xact_lock(hashtext('tff.task_number'));
  v_prefix := 'T-' || to_char(now(), 'YY') || '-';
  select coalesce(max(regexp_replace(task_number, '^.*-', '')::integer), 0)
    into v_max
  from public.tasks
  where is_deleted = false and task_number ~ ('^' || v_prefix || '[0-9]+$');

  select coalesce(is_billable, false) into v_billable from public.sub_services where id = p_sub_service_id;

  for r in select * from jsonb_array_elements(p_rows) loop
    v_client := (r->>'client_id')::uuid;
    v_assignee := nullif(r->>'assigned_to', '')::uuid;
    v_title := r->>'title';

    begin
      if not exists (
        select 1 from public.client_sub_services css
        where css.client_id = v_client and css.sub_service_id = p_sub_service_id and css.is_active is not false
      ) then
        v_failed := v_failed || jsonb_build_object('client_id', v_client, 'reason', 'This client is not linked to the service');
        continue;
      end if;

      if v_assignee is null then
        v_failed := v_failed || jsonb_build_object('client_id', v_client, 'reason', 'Choose someone to assign');
        continue;
      end if;
      if not exists (
        select 1 from public.users_profile u
        where u.id = v_assignee and u.is_active is not false and u.role in ('admin', 'team')
      ) then
        v_failed := v_failed || jsonb_build_object('client_id', v_client, 'reason', 'The assignee is not an active team member');
        continue;
      end if;

      if exists (
        select 1 from public.tasks t
        where t.client_id = v_client and t.sub_service_id = p_sub_service_id
          and t.period_key = p_period_key and t.is_deleted = false
      ) then
        v_failed := v_failed || jsonb_build_object('client_id', v_client, 'reason', 'This client already has a task for this period');
        continue;
      end if;

      v_max := v_max + 1;
      v_num := v_prefix || lpad(v_max::text, 4, '0');

      insert into public.tasks (
        client_id, sub_service_id, title, status, priority, assigned_to, due_date,
        period_type, period_key, period_year, period_month, period_quarter,
        is_billable, task_number
      ) values (
        v_client, p_sub_service_id, v_title, 'pending', p_priority, v_assignee, p_due_date,
        p_period_type, p_period_key, p_period_year, p_period_month, p_period_quarter,
        v_billable, v_num
      ) returning id into v_id;

      insert into public.task_steps (task_id, step_order, title, description, is_required, guidance_notes, source_sop_step_id)
      select v_id, s.step_order, s.title, s.description, coalesce(s.is_required, true), s.guidance_notes, s.id
      from public.sub_service_sop_steps s
      where s.sub_service_id = p_sub_service_id and s.is_deleted = false
      order by s.step_order;

      insert into public.task_activity (task_id, action, field_name, new_value, changed_by)
      values (v_id, 'created', 'status', 'pending', v_uid);

      update public.compliance_calendar_events ev
      set task_id = v_id, status = 'task_created'
      where ev.client_id = v_client
        and ev.task_id is null
        and ev.is_deleted = false
        and ev.period_key = p_period_key
        and (
          ev.sub_service_id = p_sub_service_id
          or ev.rule_id in (select cr.id from public.compliance_calendar_rules cr where cr.sub_service_id = p_sub_service_id)
        );

      v_created := v_created || jsonb_build_object('client_id', v_client, 'task_id', v_id, 'task_number', v_num);
    exception when others then
      v_failed := v_failed || jsonb_build_object('client_id', v_client, 'reason', sqlerrm);
    end;
  end loop;

  insert into public.global_audit_log (action, entity_type, performed_by, details)
  values (
    'task.deadline_bulk_create', 'task', v_uid,
    jsonb_build_object(
      'sub_service_id', p_sub_service_id,
      'period_key', p_period_key,
      'due_date', p_due_date,
      'created', jsonb_array_length(v_created),
      'failed', jsonb_array_length(v_failed)
    )
  );

  return jsonb_build_object('created', v_created, 'failed', v_failed);
end;
$$;

revoke all on function public.list_deadline_clients(uuid, text) from public;
revoke all on function public.create_deadline_tasks(uuid, text, text, integer, integer, integer, date, text, jsonb) from public;
grant execute on function public.list_deadline_clients(uuid, text) to authenticated;
grant execute on function public.create_deadline_tasks(uuid, text, text, integer, integer, integer, date, text, jsonb) to authenticated;
