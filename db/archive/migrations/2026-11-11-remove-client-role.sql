-- ============================================================================
-- 2026-11-11  Remove the client role, client portal users and dead permissions
--
-- The client portal no longer exists. No user has the 'client' role and
-- client_users is empty. This file:
--   * drops the client-facing RLS policies and the client_users table
--   * restricts users_profile.role to admin / team
--   * drops the unused portal_* columns on clients
--   * removes permissions that belonged to deleted modules from role templates
--     and individual grants (they would otherwise show up as unknown permissions)
--
-- One transaction. Refuses to run if a client user or a client_users row exists.
-- ============================================================================

DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.users_profile WHERE role = 'client';
  IF n > 0 THEN RAISE EXCEPTION 'Refusing: % users still have the client role', n; END IF;
  IF to_regclass('public.client_users') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.client_users' INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'Refusing: client_users still has % rows', n; END IF;
  END IF;
END $$;

-- Client-facing policies
DROP POLICY IF EXISTS clients_select_own        ON public.clients;
DROP POLICY IF EXISTS clients_update_own_limited ON public.clients;
DROP POLICY IF EXISTS tasks_client_view         ON public.tasks;
DROP POLICY IF EXISTS cce_client                ON public.compliance_calendar_events;
DROP POLICY IF EXISTS task_steps_client_read    ON public.task_steps;

DROP TABLE IF EXISTS public.client_users;

-- Only staff roles remain
ALTER TABLE public.users_profile DROP CONSTRAINT IF EXISTS users_profile_role_check;
ALTER TABLE public.users_profile
  ADD CONSTRAINT users_profile_role_check CHECK (role = ANY (ARRAY['admin'::text, 'team'::text]));

-- Portal columns on clients
ALTER TABLE public.clients
  DROP COLUMN IF EXISTS portal_enabled,
  DROP COLUMN IF EXISTS portal_modules,
  DROP COLUMN IF EXISTS portal_access_level;

-- The 'toggle portal' permission no longer exists: staff may update clients they are
-- assigned to or when they hold clients.edit.
ALTER POLICY clients_team_update ON public.clients
  USING (
    ((SELECT current_user_role()) = 'team'::text)
    AND (
      id IN (SELECT team_client_assignment.client_id FROM public.team_client_assignment
              WHERE team_client_assignment.team_user_id = (SELECT auth.uid()))
      OR (SELECT user_has_capability('clients.edit'::text))
    )
  );

-- Dead permissions (modules were deleted)
DELETE FROM public.staff_role_template_capabilities
 WHERE capability IN (
   'notices.view', 'notices.manage', 'hearings.view', 'hearings.manage',
   'bizlens.view', 'bizlens.enter', 'vcfo.view', 'vcfo.enter',
   'insights.view', 'insights.configure', 'payroll.run',
   'queries.view', 'queries.assign', 'clients.toggle_portal', 'manage_solution_log'
 );

DELETE FROM public.staff_capabilities
 WHERE capability IN (
   'notices.view', 'notices.manage', 'hearings.view', 'hearings.manage',
   'bizlens.view', 'bizlens.enter', 'vcfo.view', 'vcfo.enter',
   'insights.view', 'insights.configure', 'payroll.run',
   'queries.view', 'queries.assign', 'clients.toggle_portal', 'manage_solution_log'
 );
