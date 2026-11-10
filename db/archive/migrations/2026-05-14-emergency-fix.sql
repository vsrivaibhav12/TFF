-- ============================================================================
-- EMERGENCY SCHEMA FIX — missing columns in clients, tasks, and client_services
-- Date: May 14, 2026
-- ============================================================================

-- 1. FIX CLIENTS TABLE
-- Add missing created_by and plan_tier
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users_profile(id),
  ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'caas_growth'
    CHECK (plan_tier IN (
      'caas_starter','caas_growth','caas_enterprise',
      'bizlens_only',
      'vcfo_essential','vcfo_growth','vcfo_premium',
      'process_controls','cbam_esg'
    ));

-- 2. FIX TASKS TABLE
-- Add missing created_by and task_number, is_billable, bill_amount, etc.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users_profile(id),
  ADD COLUMN IF NOT EXISTS task_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bill_reference TEXT,
  ADD COLUMN IF NOT EXISTS bill_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS billed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS billed_date DATE,
  ADD COLUMN IF NOT EXISTS arn_reference TEXT,
  ADD COLUMN IF NOT EXISTS is_arn_client_visible BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS service_head_id UUID REFERENCES users_profile(id),
  ADD COLUMN IF NOT EXISTS is_blocked_on_client BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_stuck BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stuck_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_required'
    CHECK (verification_status IN ('not_required','pending','verified')),
  ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES users_profile(id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profit_centre_code TEXT,
  ADD COLUMN IF NOT EXISTS billing_entity_id UUID,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8,2);

-- 3. FIX CLIENT_SERVICES TABLE
-- Add missing service_head_id
ALTER TABLE client_services
  ADD COLUMN IF NOT EXISTS service_head_id UUID REFERENCES users_profile(id);

-- 4. FIX SERVICE_HEAD JOIN CONSISTENCY
-- Ensure the relationship used in repositories exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_services_service_head_id_fkey'
  ) THEN
    ALTER TABLE client_services
      ADD CONSTRAINT client_services_service_head_id_fkey
      FOREIGN KEY (service_head_id) REFERENCES users_profile(id);
  END IF;
END $$;

-- 5. FIX INCOME_TAX_SLABS TABLE
ALTER TABLE income_tax_slabs
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users_profile(id);

-- 6. RELOAD SCHEMA CACHE (Internal Tip)
-- After applying this, make sure to reload PostgREST schema cache in Supabase
-- Settings > API > Reload PostgREST Schema
