-- Fix missing INSERT/UPDATE RLS policies on attendance_logs
-- (Only SELECT policies existed, causing check-in/check-out to fail silently)

DO $$
BEGIN
  -- INSERT: users can insert their own attendance
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance_logs' AND policyname = 'attendance_own_insert'
  ) THEN
    CREATE POLICY attendance_own_insert ON public.attendance_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;

  -- INSERT: admins can insert for anyone
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance_logs' AND policyname = 'attendance_admin_insert'
  ) THEN
    CREATE POLICY attendance_admin_insert ON public.attendance_logs FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM public.users_profile WHERE id = auth.uid()) = 'admin');
  END IF;

  -- INSERT: managers can insert for their direct reports
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance_logs' AND policyname = 'attendance_manager_insert'
  ) THEN
    CREATE POLICY attendance_manager_insert ON public.attendance_logs FOR INSERT TO authenticated WITH CHECK ((SELECT reports_to FROM public.users_profile WHERE id = attendance_logs.user_id) = auth.uid());
  END IF;

  -- UPDATE: users can update their own attendance
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance_logs' AND policyname = 'attendance_own_update'
  ) THEN
    CREATE POLICY attendance_own_update ON public.attendance_logs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  -- UPDATE: admins can update anyone
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance_logs' AND policyname = 'attendance_admin_update'
  ) THEN
    CREATE POLICY attendance_admin_update ON public.attendance_logs FOR UPDATE TO authenticated USING ((SELECT role FROM public.users_profile WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM public.users_profile WHERE id = auth.uid()) = 'admin');
  END IF;

  -- UPDATE: managers can update their direct reports' attendance
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance_logs' AND policyname = 'attendance_manager_update'
  ) THEN
    CREATE POLICY attendance_manager_update ON public.attendance_logs FOR UPDATE TO authenticated USING ((SELECT reports_to FROM public.users_profile WHERE id = attendance_logs.user_id) = auth.uid()) WITH CHECK ((SELECT reports_to FROM public.users_profile WHERE id = attendance_logs.user_id) = auth.uid());
  END IF;
END $$;
