-- Task list search in one round trip.
--
-- The app used to run four or more separate paged queries (title, number, client name,
-- sub-service name, labels) and combine the ids in JavaScript, twice per page load
-- (once for the list, once for the count). This function returns the matching ids in a
-- single query. It is SECURITY INVOKER, so row level security applies exactly as before.
--
-- The app falls back to the old multi-query path when this function is missing, so it
-- is safe to deploy the code before or after applying this file.
--
-- p_pattern is an already-escaped ILIKE pattern, for example '%acme%'.

create or replace function public.search_task_ids(
  p_pattern text default null,
  p_labels text[] default null
)
returns table (id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  select t.id
  from public.tasks t
  where t.is_deleted = false
    and (
      p_labels is null
      or cardinality(p_labels) = 0
      or exists (
        select 1 from public.task_label_assignments a
        where a.task_id = t.id and a.label_code = any (p_labels)
      )
    )
    and (
      p_pattern is null
      or btrim(p_pattern) = ''
      or t.title ilike p_pattern
      or t.task_number ilike p_pattern
      or exists (
        select 1 from public.clients c
        where c.id = t.client_id and c.is_deleted = false and c.business_name ilike p_pattern
      )
      or exists (
        select 1 from public.sub_services s
        where s.id = t.sub_service_id and s.is_deleted = false and s.name ilike p_pattern
      )
    )
$$;

grant execute on function public.search_task_ids(text, text[]) to authenticated;
