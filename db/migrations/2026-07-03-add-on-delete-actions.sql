-- Add ON DELETE actions to foreign keys that previously lacked them.
-- This prevents hard-delete failures and orphan rows.
-- Uses DO blocks to avoid failing when a constraint name differs between environments.

DO $$
DECLARE
  r RECORD;
BEGIN
  -- tasks.client_id -> clients(id) ON DELETE CASCADE
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'tasks'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'clients' AND ccu.column_name = 'id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

  -- tasks.sub_service_id -> sub_services(id) ON DELETE SET NULL
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'tasks'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'sub_services' AND ccu.column_name = 'id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_sub_service_id_fkey
    FOREIGN KEY (sub_service_id) REFERENCES public.sub_services(id) ON DELETE SET NULL;

  -- tasks.task_template_id -> task_templates(id) ON DELETE SET NULL
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'tasks'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'task_templates' AND ccu.column_name = 'id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_task_template_id_fkey
    FOREIGN KEY (task_template_id) REFERENCES public.task_templates(id) ON DELETE SET NULL;

  -- hearings.notice_id -> notices(id) ON DELETE CASCADE
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'hearings'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'notices' AND ccu.column_name = 'id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.hearings DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
  ALTER TABLE public.hearings ADD CONSTRAINT hearings_notice_id_fkey
    FOREIGN KEY (notice_id) REFERENCES public.notices(id) ON DELETE CASCADE;

  -- queries.task_id -> tasks(id) ON DELETE SET NULL
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'queries'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'tasks' AND ccu.column_name = 'id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
  ALTER TABLE public.queries ADD CONSTRAINT queries_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

  -- team_client_assignment.client_id -> clients(id) ON DELETE CASCADE
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'team_client_assignment'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'clients' AND ccu.column_name = 'id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.team_client_assignment DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
  ALTER TABLE public.team_client_assignment ADD CONSTRAINT team_client_assignment_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

  -- team_client_assignment.team_user_id -> users_profile(id) ON DELETE CASCADE
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'team_client_assignment'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'users_profile' AND ccu.column_name = 'id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.team_client_assignment DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
  ALTER TABLE public.team_client_assignment ADD CONSTRAINT team_client_assignment_team_user_id_fkey
    FOREIGN KEY (team_user_id) REFERENCES public.users_profile(id) ON DELETE CASCADE;

  -- client_services.service_id -> services(id) ON DELETE CASCADE
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'client_services'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'services' AND ccu.column_name = 'id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.client_services DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
  ALTER TABLE public.client_services ADD CONSTRAINT client_services_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

  -- client_sub_services.sub_service_id -> sub_services(id) ON DELETE CASCADE
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'client_sub_services'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'sub_services' AND ccu.column_name = 'id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.client_sub_services DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
  ALTER TABLE public.client_sub_services ADD CONSTRAINT client_sub_services_sub_service_id_fkey
    FOREIGN KEY (sub_service_id) REFERENCES public.sub_services(id) ON DELETE CASCADE;
END $$;
