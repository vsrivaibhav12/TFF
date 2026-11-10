-- ============================================================================
-- 2026-11-10  CRITICAL security fixes
--
-- 1. Privilege escalation: any signed-in user could UPDATE their own
--    users_profile row, including role / is_prime_admin / is_active, because
--    the self-update policy had no WITH CHECK and no column guard.
-- 2. financial_data had policies but row level security switched off.
-- 3. users_profile (names, emails, salary columns) was readable by every
--    signed-in user, including clients.
--
-- Safe to re-run. Review, then apply on a Supabase branch first.
-- Rollback notes are at the bottom of the file.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Guard privileged columns on users_profile
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_users_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_is_self boolean;
BEGIN
  -- Service role, migrations and the SQL editor have no JWT user: allow.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_caller_role := public.current_user_role();

  IF TG_OP = 'INSERT' THEN
    -- Profiles are created by admins through the service-role client.
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only admins can create user profiles' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- Admins keep full control.
  IF v_caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Nobody below admin may ever change these.
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_prime_admin IS DISTINCT FROM OLD.is_prime_admin
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Only an admin can change role or admin status' USING ERRCODE = '42501';
  END IF;

  v_is_self := (OLD.id = auth.uid());

  -- On their own row, non-admins may edit only harmless contact fields.
  IF v_is_self AND (
       NEW.is_active IS DISTINCT FROM OLD.is_active
    OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
    OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
    OR NEW.active_role_template_id IS DISTINCT FROM OLD.active_role_template_id
    OR NEW.reports_to IS DISTINCT FROM OLD.reports_to
    OR NEW.manager_id IS DISTINCT FROM OLD.manager_id
    OR NEW.monthly_salary IS DISTINCT FROM OLD.monthly_salary
    OR NEW.paid_leaves_per_month IS DISTINCT FROM OLD.paid_leaves_per_month
    OR NEW.geo_check_in_required IS DISTINCT FROM OLD.geo_check_in_required
  ) THEN
    RAISE EXCEPTION 'You cannot change this field on your own profile' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_users_profile ON public.users_profile;
CREATE TRIGGER trg_guard_users_profile
  BEFORE INSERT OR UPDATE ON public.users_profile
  FOR EACH ROW EXECUTE FUNCTION public.guard_users_profile_privileged_columns();

-- Tighten the self-update policy: an explicit WITH CHECK (the trigger above is
-- the column-level guard, this stops writing someone else's row as non-admin
-- through this policy).
DROP POLICY IF EXISTS "profiles_self_update" ON public.users_profile;
CREATE POLICY "profiles_self_update" ON public.users_profile
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Stop clients (and anyone else) listing every staff profile
--    Staff (admin/team) can read all profiles; everyone can read their own.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_self_view" ON public.users_profile;
CREATE POLICY "profiles_self_view" ON public.users_profile
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.current_user_role() IN ('admin', 'team')
  );

-- ---------------------------------------------------------------------------
-- 2. financial_data: switch RLS on and give admins an explicit policy
--    (the table is empty today, so nothing is locked out).
-- ---------------------------------------------------------------------------
ALTER TABLE public.financial_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_data_admin_all" ON public.financial_data;
CREATE POLICY "financial_data_admin_all" ON public.financial_data
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Rollback (only if needed):
--   DROP TRIGGER trg_guard_users_profile ON public.users_profile;
--   DROP FUNCTION public.guard_users_profile_privileged_columns();
--   ALTER TABLE public.financial_data DISABLE ROW LEVEL SECURITY;
--   (re-create the old policies from db/rls-additive.sql if required)
-- ---------------------------------------------------------------------------
