-- Add missing CHECK and UNIQUE constraints for data integrity.
-- All additions are idempotent (IF NOT EXISTS / DROP IF EXISTS).

-- Clients: PAN length (10) and GSTIN length (15)
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_pan_length_check,
  ADD CONSTRAINT clients_pan_length_check CHECK (pan IS NULL OR LENGTH(pan) = 10);

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_gstin_length_check,
  ADD CONSTRAINT clients_gstin_length_check CHECK (gstin IS NULL OR LENGTH(gstin) = 15);

-- Payroll: year range and positive salary
ALTER TABLE public.payroll_runs
  DROP CONSTRAINT IF EXISTS payroll_runs_year_check,
  ADD CONSTRAINT payroll_runs_year_check CHECK (year BETWEEN 2000 AND 2100);

ALTER TABLE public.staff_payroll_settings
  DROP CONSTRAINT IF EXISTS staff_payroll_settings_salary_check,
  ADD CONSTRAINT staff_payroll_settings_salary_check CHECK (monthly_salary > 0);

-- Leave: date ordering
ALTER TABLE public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_date_order_check,
  ADD CONSTRAINT leave_requests_date_order_check CHECK (to_date >= from_date);

-- Documents: non-negative file size (table may have been removed in some environments)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'documents'
  ) THEN
    ALTER TABLE public.documents
      DROP CONSTRAINT IF EXISTS documents_file_size_check,
      ADD CONSTRAINT documents_file_size_check CHECK (file_size >= 0);
  END IF;
END $$;

-- DSC: expiry after issue date
ALTER TABLE public.dsc_records
  DROP CONSTRAINT IF EXISTS dsc_records_expiry_check,
  ADD CONSTRAINT dsc_records_expiry_check CHECK (expiry_date > issued_date);

-- Tasks: due date not before creation
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_due_date_check,
  ADD CONSTRAINT tasks_due_date_check CHECK (due_date >= created_at::date);

-- Exactly one prime admin. Demote duplicates first (keep the oldest created).
DO $$
DECLARE
  keeper UUID;
BEGIN
  SELECT id INTO keeper
  FROM public.users_profile
  WHERE is_prime_admin = TRUE
  ORDER BY created_at ASC NULLS FIRST
  LIMIT 1;

  IF keeper IS NOT NULL THEN
    UPDATE public.users_profile
    SET is_prime_admin = FALSE
    WHERE is_prime_admin = TRUE
      AND id != keeper;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_users_profile_one_prime_admin;
CREATE UNIQUE INDEX idx_users_profile_one_prime_admin ON public.users_profile (is_prime_admin)
  WHERE is_prime_admin = TRUE;

-- Prevent duplicate active team-client assignments for the same period
DROP INDEX IF EXISTS idx_team_client_assignment_unique_active;
CREATE UNIQUE INDEX idx_team_client_assignment_unique_active
  ON public.team_client_assignment (team_user_id, client_id, COALESCE(assigned_from, '1900-01-01'))
  WHERE assigned_to IS NULL;
