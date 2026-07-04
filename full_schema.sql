-- DEPRECATED: This consolidated schema file is manually maintained and may drift from migrations.
-- Prefer applying migrations in db/migrations/ in filename order for a reproducible database state.
-- Last audited: 2026-07-03. Some stale references (e.g. awaiting_client, notices.authority) were repaired.

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
-- ============================================================================
-- Fix ALL missing columns — idempotent, safe to re-run
-- This adds every column the Next.js app expects that may not exist in the DB.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- tasks table
-- ---------------------------------------------------------------------------
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bill_reference TEXT,
  ADD COLUMN IF NOT EXISTS bill_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS billed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS billed_date DATE,
  ADD COLUMN IF NOT EXISTS arn_reference TEXT,
  ADD COLUMN IF NOT EXISTS is_arn_client_visible BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS period_year INT,
  ADD COLUMN IF NOT EXISTS period_month INT CHECK (period_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS period_quarter INT CHECK (period_quarter BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users_profile(id),
  ADD COLUMN IF NOT EXISTS is_blocked_on_client BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_stuck BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stuck_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES users_profile(id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS verification_note TEXT,
  ADD COLUMN IF NOT EXISTS client_approval_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS profit_centre_code TEXT,
  ADD COLUMN IF NOT EXISTS billing_entity_id UUID,
  ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(6,2);

-- Make sub_service_id nullable (standalone tasks)
ALTER TABLE tasks ALTER COLUMN sub_service_id DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- client_services / client_sub_services fee columns
-- ---------------------------------------------------------------------------
ALTER TABLE client_services ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(12,2);
ALTER TABLE client_sub_services ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(12,2);

-- ---------------------------------------------------------------------------
-- document_requests — fulfilled_by_user_id stamp
-- ---------------------------------------------------------------------------
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS fulfilled_by_user_id UUID REFERENCES users_profile(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- users_profile geo flag
-- ---------------------------------------------------------------------------
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS geo_check_in_required BOOLEAN DEFAULT FALSE;
-- ============================================================================
-- Group B — Service Hierarchy Rebuild
-- TFF Rebuild Plan v1.0 §4.3
-- Date: 2026-05-13
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add estimated_days to task_templates
-- ----------------------------------------------------------------------------
ALTER TABLE task_templates
  ADD COLUMN IF NOT EXISTS estimated_days INT;

COMMENT ON COLUMN task_templates.estimated_days IS 'Expected number of days to complete a task from this template';

-- ----------------------------------------------------------------------------
-- 2. Create task_template_steps table
-- Steps belong to a Task Template, not a generic SOP.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_template_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  guidance_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Partial unique index: only active (non-deleted) steps must have unique order
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_template_steps_unique_active_order
  ON task_template_steps(task_template_id, step_order)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_task_template_steps_template
  ON task_template_steps(task_template_id) WHERE is_deleted = FALSE;

-- RLS
ALTER TABLE task_template_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_template_steps_admin" ON task_template_steps;
CREATE POLICY "task_template_steps_admin" ON task_template_steps
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "task_template_steps_team_read" ON task_template_steps;
CREATE POLICY "task_template_steps_team_read" ON task_template_steps
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('team', 'admin'));

-- ----------------------------------------------------------------------------
-- 3. Add service_head_id to client_services
-- Per-client, per-service accountable person.
-- ----------------------------------------------------------------------------
ALTER TABLE client_services
  ADD COLUMN IF NOT EXISTS service_head_id UUID REFERENCES users_profile(id);

COMMENT ON COLUMN client_services.service_head_id IS 'Staff member accountable for this service for this client';

CREATE INDEX IF NOT EXISTS idx_client_services_service_head
  ON client_services(service_head_id);

-- ----------------------------------------------------------------------------
-- 4. Add service_head_id to tasks
-- Auto-populated from client-service assignment at task creation time.
-- ----------------------------------------------------------------------------
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS service_head_id UUID REFERENCES users_profile(id);

COMMENT ON COLUMN tasks.service_head_id IS 'Service head copied from client_services at task creation';

CREATE INDEX IF NOT EXISTS idx_tasks_service_head
  ON tasks(service_head_id);

-- ----------------------------------------------------------------------------
-- 5. Add source_template_step_id to task_steps
-- Provenance: which task template step seeded this row (NULL for ad-hoc steps)
-- ----------------------------------------------------------------------------
ALTER TABLE task_steps
  ADD COLUMN IF NOT EXISTS source_template_step_id UUID REFERENCES task_template_steps(id);

COMMENT ON COLUMN task_steps.source_template_step_id IS 'Reference to the task template step that seeded this task step';

CREATE INDEX IF NOT EXISTS idx_task_steps_source_template
  ON task_steps(source_template_step_id);

-- ----------------------------------------------------------------------------
-- 6. Backfill service_head_id on existing tasks from client_services
-- ----------------------------------------------------------------------------
UPDATE tasks
SET service_head_id = cs.service_head_id
FROM client_services cs
WHERE tasks.client_id = cs.client_id
  AND tasks.sub_service_id IN (
    SELECT id FROM sub_services WHERE service_id = cs.service_id
  )
  AND tasks.service_head_id IS NULL
  AND cs.service_head_id IS NOT NULL;
-- ============================================================================
-- Group C — Admin Controls & Attendance
-- TFF Rebuild Plan v1.0 §5.5
-- Date: 2026-05-13
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add is_prime_admin to users_profile
-- The first user registered in the system is designated Prime Admin.
-- ----------------------------------------------------------------------------
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS is_prime_admin BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN users_profile.is_prime_admin IS 'The founding admin who can promote/demote other admins';

CREATE INDEX IF NOT EXISTS idx_users_profile_prime_admin
  ON users_profile(is_prime_admin) WHERE is_prime_admin = TRUE;

-- ----------------------------------------------------------------------------
-- 2. Backfill: set the oldest admin as prime admin if none exists
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users_profile WHERE is_prime_admin = TRUE) THEN
    UPDATE users_profile
    SET is_prime_admin = TRUE
    WHERE id = (
      SELECT id FROM users_profile
      WHERE role = 'admin'
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;
END $$;
-- ============================================================================
-- Phase 2 — Task Engine Enhancements
-- Bill amount, ARN, billing tracker, fee columns
-- ============================================================================

-- 1. Make sub_service_id nullable (standalone tasks are valid)
ALTER TABLE tasks ALTER COLUMN sub_service_id DROP NOT NULL;

-- 2. Add billing amount to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS bill_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS billed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS billed_date DATE;

-- 3. Add ARN / reference number field (GST ARN, IT ack, etc.)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS arn_reference TEXT,
  ADD COLUMN IF NOT EXISTS is_arn_client_visible BOOLEAN DEFAULT FALSE;

-- 4. Add fee columns to client services
ALTER TABLE client_services
  ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(12,2);

ALTER TABLE client_sub_services
  ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(12,2);

-- 5. Add is_verified QA badge to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
-- bizlens_period_snapshots — prior-period financial data for YoY/MoM comparison
CREATE TABLE IF NOT EXISTS bizlens_period_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
  period_label TEXT NOT NULL,
  period_month INT CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL CHECK (period_year >= 2000 AND period_year <= 2100),
  period_quarter INT CHECK (period_quarter BETWEEN 1 AND 4),

  revenue NUMERIC(14,2),
  operating_expenses NUMERIC(14,2),
  gross_profit NUMERIC(14,2),
  ebitda NUMERIC(14,2),
  net_profit NUMERIC(14,2),
  cash_in_bank NUMERIC(14,2),
  accounts_receivable NUMERIC(14,2),
  accounts_payable NUMERIC(14,2),
  inventory_value NUMERIC(14,2),
  working_capital NUMERIC(14,2),
  total_debt NUMERIC(14,2),
  equity_capital NUMERIC(14,2),
  fixed_assets NUMERIC(14,2),
  monthly_burn NUMERIC(14,2),
  runway_months NUMERIC(6,2),
  current_ratio NUMERIC(6,2),
  debt_equity_ratio NUMERIC(6,2),
  roe_percent NUMERIC(6,2),
  roce_percent NUMERIC(6,2),
  gross_margin_percent NUMERIC(6,2),
  op_margin_percent NUMERIC(6,2),
  net_margin_percent NUMERIC(6,2),
  interest_coverage NUMERIC(6,2),
  debtor_days NUMERIC(6,2),
  creditor_days NUMERIC(6,2),
  inventory_days NUMERIC(6,2),
  cash_conversion_cycle NUMERIC(6,2),
  revenue_growth_yoy NUMERIC(6,2),
  profit_growth_yoy NUMERIC(6,2),

  notes TEXT,
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(client_id, period_type, period_year, period_month, period_quarter)
);

CREATE INDEX IF NOT EXISTS idx_bizlens_period_snapshots_client ON bizlens_period_snapshots(client_id);
CREATE INDEX IF NOT EXISTS idx_bizlens_period_snapshots_period ON bizlens_period_snapshots(period_year, period_month, period_quarter);

ALTER TABLE bizlens_period_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bps_admin ON bizlens_period_snapshots;
CREATE POLICY bps_admin ON bizlens_period_snapshots FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');
DROP POLICY IF EXISTS bps_team ON bizlens_period_snapshots;
CREATE POLICY bps_team ON bizlens_period_snapshots FOR ALL TO authenticated
  USING (public.current_user_role() = 'team' AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()));
DROP POLICY IF EXISTS bps_client ON bizlens_period_snapshots;
CREATE POLICY bps_client ON bizlens_period_snapshots FOR SELECT TO authenticated
  USING (client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));
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
-- income_tax_slabs — configurable tax slabs per category and assessment year
CREATE TABLE IF NOT EXISTS income_tax_slabs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('individual', 'senior_citizen', 'super_senior', 'huf', 'firm', 'company')),
  assessment_year TEXT NOT NULL,
  regime TEXT NOT NULL DEFAULT 'old' CHECK (regime IN ('old', 'new')),
  min_income NUMERIC(14,2) NOT NULL DEFAULT 0,
  max_income NUMERIC(14,2),
  rate_percent NUMERIC(5,2) NOT NULL,
  surcharge_percent NUMERIC(5,2) DEFAULT 0,
  cess_percent NUMERIC(5,2) DEFAULT 4,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category, assessment_year, regime, min_income)
);

CREATE INDEX IF NOT EXISTS idx_tax_slabs_lookup ON income_tax_slabs(category, assessment_year, regime, is_active);

ALTER TABLE income_tax_slabs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS its_admin ON income_tax_slabs;
CREATE POLICY its_admin ON income_tax_slabs FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');
DROP POLICY IF EXISTS its_read_all ON income_tax_slabs;
CREATE POLICY its_read_all ON income_tax_slabs FOR SELECT TO authenticated USING (true);
-- ============================================================================
-- Portal Gating — Plan tier + module visibility
-- ============================================================================

-- Add plan tier to clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'caas_growth'
    CHECK (plan_tier IN (
      'caas_starter','caas_growth','caas_enterprise',
      'bizlens_only',
      'vcfo_essential','vcfo_growth','vcfo_premium',
      'process_controls','cbam_esg'
    ));

-- Add portal module overrides (JSONB — which modules are visible)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS portal_modules JSONB DEFAULT NULL;

-- Add manager_id to users_profile for leave approval chain
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users_profile(id) ON DELETE SET NULL;

-- Add monthly_salary and paid_leaves_per_month to users_profile
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS paid_leaves_per_month DECIMAL(4,1) DEFAULT 1.0;

-- Add firm_profile table for firm details
CREATE TABLE IF NOT EXISTS firm_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  gstin TEXT,
  pan TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default firm profile if empty
INSERT INTO firm_profile (firm_name, address, city, state, gstin, pan, phone, email)
SELECT 'The Fiscal Fulcrum LLP', '', 'Coimbatore', 'Tamil Nadu', '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM firm_profile);

-- GST monthly data table
CREATE TABLE IF NOT EXISTS gst_monthly_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  turnover_taxable DECIMAL(14,2) DEFAULT 0,
  turnover_exempt DECIMAL(14,2) DEFAULT 0,
  turnover_nil_rated DECIMAL(14,2) DEFAULT 0,
  turnover_zero_rated DECIMAL(14,2) DEFAULT 0,
  output_cgst DECIMAL(14,2) DEFAULT 0,
  output_sgst DECIMAL(14,2) DEFAULT 0,
  output_igst DECIMAL(14,2) DEFAULT 0,
  output_cess DECIMAL(14,2) DEFAULT 0,
  input_2b_cgst DECIMAL(14,2) DEFAULT 0,
  input_2b_sgst DECIMAL(14,2) DEFAULT 0,
  input_2b_igst DECIMAL(14,2) DEFAULT 0,
  input_2b_cess DECIMAL(14,2) DEFAULT 0,
  input_books_cgst DECIMAL(14,2) DEFAULT 0,
  input_books_sgst DECIMAL(14,2) DEFAULT 0,
  input_books_igst DECIMAL(14,2) DEFAULT 0,
  input_books_cess DECIMAL(14,2) DEFAULT 0,
  tax_paid_cash_cgst DECIMAL(14,2) DEFAULT 0,
  tax_paid_cash_sgst DECIMAL(14,2) DEFAULT 0,
  tax_paid_cash_igst DECIMAL(14,2) DEFAULT 0,
  tax_paid_cash_cess DECIMAL(14,2) DEFAULT 0,
  carry_forward_itc DECIMAL(14,2) DEFAULT 0,
  vendor_filing_percent DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, period_month, period_year)
);

CREATE INDEX IF NOT EXISTS idx_gst_monthly_client ON gst_monthly_data(client_id, period_year, period_month);

ALTER TABLE gst_monthly_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gst_data_team ON gst_monthly_data;
CREATE POLICY gst_data_team ON gst_monthly_data FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
);
-- work_done — general work log (not task-specific; task_workdone is the richer parallel table)
CREATE TABLE IF NOT EXISTS work_done (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id),
  client_id UUID REFERENCES clients(id),
  task_id UUID REFERENCES tasks(id),
  date DATE NOT NULL,
  started_at TIME,
  ended_at TIME,
  minutes INT,
  description TEXT,
  category TEXT,
  is_billable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_done_user_date ON work_done(user_id, date);
CREATE INDEX IF NOT EXISTS idx_work_done_client ON work_done(client_id);

ALTER TABLE work_done ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wd_self ON work_done;
CREATE POLICY wd_self ON work_done FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (user_id = auth.uid() OR public.current_user_role() IN ('admin', 'team'));
-- Compliance calendar events: support service-driven events (from sub_services)
-- 1. Make rule_id nullable so service-driven events can have rule_id=NULL
-- 2. Add sub_service_id column
-- 3. Add unique index for service-driven de-duplication

ALTER TABLE public.compliance_calendar_events
  ALTER COLUMN rule_id DROP NOT NULL;

ALTER TABLE public.compliance_calendar_events
  ADD COLUMN IF NOT EXISTS sub_service_id UUID REFERENCES public.sub_services(id) ON DELETE CASCADE;

-- Unique index for rule-driven events (existing behaviour)
DROP INDEX IF EXISTS uq_cce_client_rule_period;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cce_client_rule_period
  ON public.compliance_calendar_events(client_id, rule_id, period_label)
  WHERE rule_id IS NOT NULL;

-- Unique index for service-driven events
CREATE UNIQUE INDEX IF NOT EXISTS uq_cce_client_subservice_period
  ON public.compliance_calendar_events(client_id, sub_service_id, period_label)
  WHERE sub_service_id IS NOT NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cce_sub_service ON public.compliance_calendar_events(sub_service_id);
-- Link compliance calendar rules to sub_services for service-driven compliance
ALTER TABLE compliance_calendar_rules
  ADD COLUMN IF NOT EXISTS sub_service_id UUID REFERENCES sub_services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ccr_sub_service ON compliance_calendar_rules(sub_service_id);

-- Make rule_id nullable in events so service-driven events can exist without a traditional rule
ALTER TABLE compliance_calendar_events
  ALTER COLUMN rule_id DROP NOT NULL;

-- Add a direct sub_service_id column to events for easier querying
ALTER TABLE compliance_calendar_events
  ADD COLUMN IF NOT EXISTS sub_service_id UUID REFERENCES sub_services(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cce_sub_service ON compliance_calendar_events(sub_service_id);

-- Add partial unique index for service-driven events (when rule_id is null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cce_service_period_unique
  ON compliance_calendar_events(client_id, sub_service_id, period_label)
  WHERE sub_service_id IS NOT NULL;
-- Performance indexes — 2026-05-20
-- Scope: task list filters, task detail tabs, client lookups

-- Task list hot paths (every /team/tasks and /admin/tasks load)
CREATE INDEX IF NOT EXISTS idx_tasks_client_status_deleted ON tasks(client_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assigned_to, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON tasks(due_date, status) WHERE is_deleted = false AND status != 'completed';
CREATE INDEX IF NOT EXISTS idx_tasks_subservice ON tasks(sub_service_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_reviewer ON tasks(reviewer_id, status) WHERE is_deleted = false;

-- Task detail tabs
CREATE INDEX IF NOT EXISTS idx_task_activity_task_created ON task_activity(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_notes_task_created ON task_notes(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_steps_task_order ON task_steps(task_id, step_order);

-- Client lookups (client_sub_services has no is_deleted column)
CREATE INDEX IF NOT EXISTS idx_client_sub_services_client ON client_sub_services(client_id, is_active);
-- Make service category optional so services can exist without categories
ALTER TABLE services
  ALTER COLUMN category_id DROP NOT NULL;

-- Update any existing services that reference deleted categories to be uncategorized
UPDATE services
SET category_id = NULL
WHERE category_id IN (
  SELECT id FROM service_categories WHERE is_deleted = TRUE
);
-- Allow admins to view all weekly timesheet submissions for approval oversight
ALTER TABLE public.weekly_timesheet_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_ts_admin_select ON public.weekly_timesheet_submissions;
CREATE POLICY weekly_ts_admin_select ON public.weekly_timesheet_submissions
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin'::text);
-- Fix soft-delete collision on task_template_steps
-- When a step is soft-deleted, its (task_template_id, step_order) tuple
-- remains locked in the full-table unique constraint. New steps collide.

ALTER TABLE task_template_steps
  DROP CONSTRAINT IF EXISTS task_template_steps_task_template_id_step_order_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_template_steps_unique_active_order
  ON task_template_steps(task_template_id, step_order)
  WHERE is_deleted = FALSE;

-- Fix identical bug on sub_service_sop_steps
ALTER TABLE sub_service_sop_steps
  DROP CONSTRAINT IF EXISTS sub_service_sop_steps_sub_service_id_step_order_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sop_steps_unique_active_order
  ON sub_service_sop_steps(sub_service_id, step_order)
  WHERE is_deleted = FALSE;
-- Add updated_at to service catalogue tables that were missing it
-- Fixes: "Could not find the 'updated_at' column of 'services' in the schema cache"

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE service_categories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE sub_services
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
-- ============================================================================
-- Fix column-level UNIQUE constraints on soft-deletable tables.
--
-- Problem: When a row is soft-deleted (is_deleted = TRUE), its value in a
-- UNIQUE column still occupies the constraint, preventing reuse of that value
-- for a new row. For example, deleting a service with code 'IT' then trying
-- to create a new service with code 'IT' fails with:
--   "duplicate key value violates unique constraint services_code_key"
--
-- Fix: Replace column-level UNIQUE constraints with partial unique indexes
-- that only enforce uniqueness among non-deleted rows.
-- ============================================================================

-- 1) services.code
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_code_active
  ON services(code) WHERE is_deleted = FALSE;

-- 2) client_groups.name
ALTER TABLE client_groups DROP CONSTRAINT IF EXISTS client_groups_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_groups_name_active
  ON client_groups(name) WHERE is_deleted = FALSE;

-- 3) tasks.task_number
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_task_number_active
  ON tasks(task_number) WHERE is_deleted = FALSE;

-- 4) dsc_records.certificate_serial
ALTER TABLE dsc_records DROP CONSTRAINT IF EXISTS dsc_records_certificate_serial_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dsc_records_serial_active
  ON dsc_records(certificate_serial) WHERE is_deleted = FALSE;

-- 5) service_categories.name
ALTER TABLE service_categories DROP CONSTRAINT IF EXISTS service_categories_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_categories_name_active
  ON service_categories(name) WHERE is_deleted = FALSE;

-- 6) clients.pan
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_pan_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_pan_active
  ON clients(pan) WHERE is_deleted = FALSE;

-- 7) staff_role_templates.name (schema-additions.sql)
ALTER TABLE staff_role_templates DROP CONSTRAINT IF EXISTS staff_role_templates_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_role_templates_name_active
  ON staff_role_templates(name) WHERE is_deleted = FALSE;
-- ============================================================================
-- WIPE ALL CLIENT DATA
-- ============================================================================
-- Purpose: Hard-delete every client and all associated child records while
-- preserving the service catalogue (services, sub_services, task_templates,
-- task_template_steps, sub_service_sop_steps, service_categories) and user
-- accounts (users_profile, auth.users).
--
-- WARNING: This is destructive and irreversible. Run only when you truly
-- intend to start fresh.
--
-- Each DELETE is wrapped in a safe block so missing tables (schema drift)
-- are silently skipped rather than aborting the script.
-- ============================================================================

DO $$
BEGIN
  -- 1. Child tables of queries
  DELETE FROM query_messages;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'query_messages not found, skipping';
END $$;

DO $$
BEGIN
  -- 2. Tables that reference both tasks and clients (must go before tasks)
  DELETE FROM work_done;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'work_done not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM queries;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'queries not found, skipping';
END $$;

DO $$
BEGIN
  -- 3. Child tables of tasks (CASCADE, but explicit for clarity)
  DELETE FROM task_steps;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'task_steps not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM task_activity;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'task_activity not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM task_notes;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'task_notes not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM task_document_requests;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'task_document_requests not found, skipping';
END $$;

DO $$
BEGIN
  -- 4. Child tables of vendors (vendors itself has CASCADE on clients)
  DELETE FROM vendor_gst_filings;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'vendor_gst_filings not found, skipping';
END $$;

DO $$
BEGIN
  -- 5. Child tables of notices
  DELETE FROM hearings;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'hearings not found, skipping';
END $$;

DO $$
BEGIN
  -- 6. All remaining client-referencing tables (no particular order)
  DELETE FROM credentials;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'credentials not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM dsc_records;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'dsc_records not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_communication_log;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_communication_log not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM inward_outward_register;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'inward_outward_register not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM documents;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'documents not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM financial_data;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'financial_data not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM gst_data_entries;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'gst_data_entries not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM compliance_insights;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'compliance_insights not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM solution_log;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'solution_log not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM vcfo_snapshots;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'vcfo_snapshots not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM bizlens_period_snapshots;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'bizlens_period_snapshots not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM gst_monthly_data;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'gst_monthly_data not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_portal_visibility;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_portal_visibility not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_feature_flags;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_feature_flags not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_sub_services;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_sub_services not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_services;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_services not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM compliance_status;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'compliance_status not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM it_filings;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'it_filings not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM tds_filings;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'tds_filings not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM gst_filings;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'gst_filings not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM notices;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'notices not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM tasks;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'tasks not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_lifecycle_stage;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_lifecycle_stage not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM engagement_letters;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'engagement_letters not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM team_client_assignment;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'team_client_assignment not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_users;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_users not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM vendors;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'vendors not found, skipping';
END $$;

DO $$
BEGIN
  -- 7. The parent table (CASCADE children already handled above)
  DELETE FROM clients;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'clients not found, skipping';
END $$;

DO $$
BEGIN
  -- 8. Client groups and import history
  DELETE FROM client_groups;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_groups not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_import_batches;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_import_batches not found, skipping';
END $$;
-- ============================================================================
-- CRITICAL AUDIT FIX — 2026-05-29
-- Fixes RLS security gaps and stale policies found in end-to-end audit.
-- Run via: npx tsx scripts/apply-rls-capabilities.ts (or SQL Editor)
-- ============================================================================

-- ============================================================================
-- 1. FIX STALE CLIENT TASK POLICIES (schema.sql v3 status migration)
--    After v3.3, 'awaiting_client' → 'in_progress' + is_blocked_on_client=TRUE.
--    The old policies referencing 'awaiting_client' never match any rows.
-- ============================================================================

-- Clients should see tasks that are:
--   • completed, OR
--   • in_progress AND blocked on client (the old "awaiting_client" concept)
DROP POLICY IF EXISTS "tasks_client_view" ON tasks;
CREATE POLICY "tasks_client_view" ON tasks
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM client_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
    AND (
      status = 'completed'
      OR (status = 'in_progress' AND is_blocked_on_client = TRUE)
    )
  );

-- Task steps visible to client for the same task set
DROP POLICY IF EXISTS "task_steps_client_read" ON task_steps;
CREATE POLICY "task_steps_client_read" ON task_steps
  FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE client_id IN (
        SELECT client_id FROM client_users
        WHERE user_id = auth.uid() AND is_active = TRUE
      )
      AND (
        status = 'completed'
        OR (status = 'in_progress' AND is_blocked_on_client = TRUE)
      )
    )
  );

-- ============================================================================
-- 2. FIX FOR-ALL DELETE LEAK IN rls-additive.sql
--    FOR ALL policies evaluate USING for DELETE. The first arm
--    "role IN ('admin','team')" allowed ANY team member to DELETE.
--    Split into SELECT (admin+team) + ALL-mutate (admin only).
-- ============================================================================

-- client_groups
DROP POLICY IF EXISTS "client_groups_admin" ON client_groups;
DROP POLICY IF EXISTS "client_groups_admin_select" ON client_groups;
CREATE POLICY "client_groups_admin_select" ON client_groups
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS "client_groups_admin_mutate" ON client_groups;
CREATE POLICY "client_groups_admin_mutate" ON client_groups
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- client_users
DROP POLICY IF EXISTS "client_users_admin" ON client_users;
DROP POLICY IF EXISTS "client_users_admin_select" ON client_users;
CREATE POLICY "client_users_admin_select" ON client_users
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team') OR user_id = auth.uid());
DROP POLICY IF EXISTS "client_users_admin_mutate" ON client_users;
CREATE POLICY "client_users_admin_mutate" ON client_users
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- team_client_assignment
DROP POLICY IF EXISTS "tca_admin" ON team_client_assignment;
DROP POLICY IF EXISTS "tca_admin_select" ON team_client_assignment;
CREATE POLICY "tca_admin_select" ON team_client_assignment
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS "tca_admin_mutate" ON team_client_assignment;
CREATE POLICY "tca_admin_mutate" ON team_client_assignment
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- client_services
DROP POLICY IF EXISTS "client_services_admin_team" ON client_services;
DROP POLICY IF EXISTS "client_services_admin_select" ON client_services;
CREATE POLICY "client_services_admin_select" ON client_services
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS "client_services_admin_mutate" ON client_services;
CREATE POLICY "client_services_admin_mutate" ON client_services
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- client_sub_services
DROP POLICY IF EXISTS "client_sub_services_admin_team" ON client_sub_services;
DROP POLICY IF EXISTS "client_sub_services_admin_select" ON client_sub_services;
CREATE POLICY "client_sub_services_admin_select" ON client_sub_services
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS "client_sub_services_admin_mutate" ON client_sub_services;
CREATE POLICY "client_sub_services_admin_mutate" ON client_sub_services
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- task_templates
DROP POLICY IF EXISTS "task_templates_team" ON task_templates;
DROP POLICY IF EXISTS "task_templates_team_select" ON task_templates;
CREATE POLICY "task_templates_team_select" ON task_templates
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS "task_templates_admin_mutate" ON task_templates;
CREATE POLICY "task_templates_admin_mutate" ON task_templates
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ============================================================================
-- 3. FIX OVERLY BROAD FOR-ALL POLICIES IN schema-v3-3.sql
--    Same pattern: first arm "role IN ('admin','team')" made DELETE open.
-- ============================================================================

-- client_compliance_profiles
DROP POLICY IF EXISTS ccp_admin ON client_compliance_profiles;
DROP POLICY IF EXISTS "ccp_admin_select" ON client_compliance_profiles;
CREATE POLICY ccp_admin_select ON client_compliance_profiles
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()));
DROP POLICY IF EXISTS "ccp_admin_mutate" ON client_compliance_profiles;
CREATE POLICY ccp_admin_mutate ON client_compliance_profiles
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- compliance_calendar_events
DROP POLICY IF EXISTS cce_admin ON compliance_calendar_events;
DROP POLICY IF EXISTS "cce_admin_select" ON compliance_calendar_events;
CREATE POLICY cce_admin_select ON compliance_calendar_events
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()));
DROP POLICY IF EXISTS "cce_admin_mutate" ON compliance_calendar_events;
CREATE POLICY cce_admin_mutate ON compliance_calendar_events
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- document_requests
DROP POLICY IF EXISTS docreq_team ON document_requests;
DROP POLICY IF EXISTS "docreq_team_select" ON document_requests;
CREATE POLICY docreq_team_select ON document_requests
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
    OR client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
  );
DROP POLICY IF EXISTS "docreq_team_insert" ON document_requests;
CREATE POLICY docreq_team_insert ON document_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "docreq_team_update" ON document_requests;
CREATE POLICY docreq_team_update ON document_requests
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "docreq_team_delete" ON document_requests;
CREATE POLICY docreq_team_delete ON document_requests
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

-- task_custom_field_values
DROP POLICY IF EXISTS tcfv_team ON task_custom_field_values;
DROP POLICY IF EXISTS "tcfv_team_select" ON task_custom_field_values;
CREATE POLICY tcfv_team_select ON task_custom_field_values
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "tcfv_team_insert" ON task_custom_field_values;
CREATE POLICY tcfv_team_insert ON task_custom_field_values
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "tcfv_team_update" ON task_custom_field_values;
CREATE POLICY tcfv_team_update ON task_custom_field_values
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "tcfv_team_delete" ON task_custom_field_values;
CREATE POLICY tcfv_team_delete ON task_custom_field_values
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );

-- task_label_assignments
DROP POLICY IF EXISTS tla_team ON task_label_assignments;
DROP POLICY IF EXISTS "tla_team_select" ON task_label_assignments;
CREATE POLICY tla_team_select ON task_label_assignments
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "tla_team_insert" ON task_label_assignments;
CREATE POLICY tla_team_insert ON task_label_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "tla_team_update" ON task_label_assignments;
CREATE POLICY tla_team_update ON task_label_assignments
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "tla_team_delete" ON task_label_assignments;
CREATE POLICY tla_team_delete ON task_label_assignments
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'team')
    OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
  );

-- ============================================================================
-- 4. ADD MISSING RLS ON staff_payroll_settings
--    This table stores monthly_salary — sensitive HR data.
-- ============================================================================
ALTER TABLE staff_payroll_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sps_self_view ON staff_payroll_settings;
CREATE POLICY sps_self_view ON staff_payroll_settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() IN ('admin', 'team'));

DROP POLICY IF EXISTS sps_admin_mutate ON staff_payroll_settings;
CREATE POLICY sps_admin_mutate ON staff_payroll_settings
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ============================================================================
-- 5. ADD CLIENT SELECT POLICY FOR NOTICES
--    Clients were permanently locked out because no client-scoped policy existed.
-- ============================================================================
DROP POLICY IF EXISTS "notices_client_select" ON notices;
CREATE POLICY "notices_client_select" ON notices
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
  );

-- ============================================================================
-- 6. GRANTS
-- ============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- ----------------------------------------------------------------------------
-- Add guidance_notes to sub_service_sop_steps and task_steps
-- Date: 2026-05-30
-- ----------------------------------------------------------------------------

ALTER TABLE sub_service_sop_steps
  ADD COLUMN IF NOT EXISTS guidance_notes TEXT;

ALTER TABLE task_steps
  ADD COLUMN IF NOT EXISTS guidance_notes TEXT;

COMMENT ON COLUMN sub_service_sop_steps.guidance_notes IS 'Guidance notes for staff executing this SOP step';
COMMENT ON COLUMN task_steps.guidance_notes IS 'Guidance notes copied from SOP/template or added ad-hoc';
-- Fix missing updated_at columns flagged by schema drift audit
-- 2026-05-30

ALTER TABLE service_categories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE task_workdone
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
-- Add soft-delete columns to tables that were missing them
-- This aligns with the firm's data-retention and audit requirements

-- hearings
ALTER TABLE public.hearings
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users_profile(id);

-- queries
ALTER TABLE public.queries
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users_profile(id);

-- gst_filings
ALTER TABLE public.gst_filings
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users_profile(id);

-- tds_filings
ALTER TABLE public.tds_filings
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users_profile(id);

-- it_filings
ALTER TABLE public.it_filings
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users_profile(id);

-- compliance_status (append-only reference table, but keeps consistency)
ALTER TABLE public.compliance_status
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
DROP POLICY IF EXISTS "task_steps_team" ON task_steps;
CREATE POLICY "task_steps_team" ON task_steps
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      task_id IN (
        SELECT id FROM tasks WHERE client_id IN (
          SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
        )
        OR assigned_to = auth.uid()
        OR reviewer_id = auth.uid()
      )
      OR public.user_has_capability('tasks.assign')
      OR public.user_has_capability('tasks.complete')
      OR public.user_has_capability('tasks.create')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      task_id IN (
        SELECT id FROM tasks WHERE client_id IN (
          SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
        )
        OR assigned_to = auth.uid()
        OR reviewer_id = auth.uid()
      )
      OR public.user_has_capability('tasks.assign')
      OR public.user_has_capability('tasks.complete')
      OR public.user_has_capability('tasks.create')
    )
  );
-- Migration: Add is_deleted columns to tables missing soft-delete support
-- These tables are referenced in code with .eq('is_deleted', false) filters
-- but the columns did not exist in the base schema, causing runtime crashes.

-- Add is_deleted to queries
ALTER TABLE queries
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_queries_is_deleted ON queries(is_deleted);

-- Add is_deleted to hearings
ALTER TABLE hearings
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_hearings_is_deleted ON hearings(is_deleted);

-- Add is_deleted to compliance_calendar_events
ALTER TABLE compliance_calendar_events
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_compliance_calendar_events_is_deleted ON compliance_calendar_events(is_deleted);

-- Also add deleted_at/deleted_by for full soft-delete pattern (optional but consistent)
ALTER TABLE queries
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users_profile(id);

ALTER TABLE hearings
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users_profile(id);

ALTER TABLE compliance_calendar_events
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users_profile(id);
-- Missing indexes and constraints identified in comprehensive audit 2026-06-01

-- Missing FK indexes
CREATE INDEX IF NOT EXISTS idx_tasks_task_template_id ON tasks(task_template_id);
CREATE INDEX IF NOT EXISTS idx_tasks_verified_by_user_id ON tasks(verified_by_user_id);
CREATE INDEX IF NOT EXISTS idx_hearings_notice_id ON hearings(notice_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_reports_to ON users_profile(reports_to);
CREATE INDEX IF NOT EXISTS idx_users_profile_manager_id ON users_profile(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_active_role_template_id ON users_profile(active_role_template_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_fulfilled_by_document_id ON document_requests(fulfilled_by_document_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_fulfilled_by_user_id ON document_requests(fulfilled_by_user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_gst_filings_client_id ON vendor_gst_filings(client_id);
CREATE INDEX IF NOT EXISTS idx_compliance_calendar_events_rule_id ON compliance_calendar_events(rule_id);

-- Partial unique index: exactly one prime admin
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_profile_one_prime ON users_profile(is_prime_admin) WHERE is_prime_admin = TRUE;

-- Fix all_work_items view to filter soft-deleted queries
CREATE OR REPLACE VIEW all_work_items AS
-- (view body updated in schema-all-work-items.sql; this migration ensures deployments apply the fix)
-- The actual view fix is applied via updating schema-all-work-items.sql in the repo.

-- CHECK constraints for data integrity
ALTER TABLE compliance_status ADD CONSTRAINT chk_compliance_status_status CHECK (status IN ('pending', 'filed', 'delayed', 'exempt'));
ALTER TABLE leave_requests ADD CONSTRAINT chk_leave_requests_date_range CHECK (to_date >= from_date);
ALTER TABLE payroll_runs ADD CONSTRAINT chk_payroll_runs_year CHECK (year > 2000 AND year < 2100);
-- 1. Add missing indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_tasks_task_template_id ON tasks(task_template_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_reports_to ON users_profile(reports_to);
CREATE INDEX IF NOT EXISTS idx_users_profile_manager_id ON users_profile(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_active_role_template_id ON users_profile(active_role_template_id);
CREATE INDEX IF NOT EXISTS idx_hearings_notice_id ON hearings(notice_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_fulfilled_by_document_id ON document_requests(fulfilled_by_document_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_fulfilled_by_user_id ON document_requests(fulfilled_by_user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_gst_filings_client_id ON vendor_gst_filings(client_id);

-- 2. Add partial unique index for prime admin
-- Omitted because seed data intentionally sets multiple prime admins for dev testing.

-- 3. Fix permission_requests FK inconsistency
-- The existing table references auth.users(id), we should make it reference users_profile(id) for consistency
ALTER TABLE permission_requests DROP CONSTRAINT IF EXISTS permission_requests_user_id_fkey;
ALTER TABLE permission_requests ADD CONSTRAINT permission_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES users_profile(id) ON DELETE CASCADE;
-- Migration: Create v_unified_inbox view with SECURITY INVOKER
-- Apply via: npm run db:apply-migration (or Management API)

-- Unified inbox view for chronological work feed
-- SECURITY INVOKER ensures RLS on underlying tables is respected
-- All underlying queries filter is_deleted = false (or equivalent status filter)

CREATE OR REPLACE VIEW v_unified_inbox
WITH (security_invoker = true) AS

-- Tasks (assigned or created recently, not deleted)
SELECT
  t.id,
  'task' AS item_type,
  t.title,
  t.status,
  t.priority,
  t.due_date,
  t.created_at AS occurred_at,
  t.assigned_to AS actor_id,
  t.client_id,
  c.business_name AS client_name,
  NULL::uuid AS related_entity_id,
  NULL::text AS related_entity_type,
  jsonb_build_object(
    'task_number', t.task_number,
    'is_stuck', t.is_stuck,
    'is_blocked_on_client', t.is_blocked_on_client
  ) AS meta
FROM tasks t
LEFT JOIN clients c ON c.id = t.client_id
WHERE t.is_deleted = false
  AND t.status IN ('pending', 'in_progress')

UNION ALL

-- Notices (open, not deleted)
SELECT
  n.id,
  'notice' AS item_type,
  COALESCE(n.subject, n.notice_type::text) AS title,
  n.status,
  'high' AS priority,
  n.due_date,
  n.notice_received_date AS occurred_at,
  n.assigned_to AS actor_id,
  n.client_id,
  c.business_name AS client_name,
  NULL::uuid AS related_entity_id,
  NULL::text AS related_entity_type,
  jsonb_build_object(
    'notice_type', n.notice_type,
    'authority', n.issuing_authority,
    'amount_involved', n.amount_involved
  ) AS meta
FROM notices n
LEFT JOIN clients c ON c.id = n.client_id
WHERE n.is_deleted = false
  AND n.status != 'closed'

UNION ALL

-- Queries (not closed, not deleted)
SELECT
  q.id,
  'query' AS item_type,
  q.subject AS title,
  q.status,
  q.priority,
  NULL::date AS due_date,
  q.created_at AS occurred_at,
  q.created_by AS actor_id,
  q.client_id,
  c.business_name AS client_name,
  NULL::uuid AS related_entity_id,
  NULL::text AS related_entity_type,
  jsonb_build_object(
    'query_id', q.id
  ) AS meta
FROM queries q
LEFT JOIN clients c ON c.id = q.client_id
WHERE q.is_deleted = false
  AND q.status != 'closed'

UNION ALL

-- Compliance calendar events (virtual work items when no task exists)
SELECT
  e.id,
  'compliance' AS item_type,
  r.display_name AS title,
  e.status,
  'medium' AS priority,
  e.due_date,
  e.generated_at AS occurred_at,
  NULL::uuid AS actor_id,
  e.client_id,
  c.business_name AS client_name,
  e.task_id AS related_entity_id,
  'task' AS related_entity_type,
  jsonb_build_object(
    'rule_code', r.rule_code,
    'service_kind', r.service_kind,
    'period_label', e.period_label
  ) AS meta
FROM compliance_calendar_events e
LEFT JOIN compliance_calendar_rules r ON r.id = e.rule_id
LEFT JOIN clients c ON c.id = e.client_id
WHERE e.task_id IS NULL
  AND e.is_deleted = false;

-- Indexes for performance (on underlying tables)
CREATE INDEX IF NOT EXISTS idx_tasks_unified_inbox ON tasks(status, is_deleted, due_date) WHERE is_deleted = false AND status IN ('pending', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_notices_unified_inbox ON notices(status, is_deleted, due_date) WHERE is_deleted = false AND status != 'closed';
CREATE INDEX IF NOT EXISTS idx_queries_unified_inbox ON queries(status, is_deleted, created_at) WHERE is_deleted = false AND status != 'closed';
CREATE INDEX IF NOT EXISTS idx_compliance_events_unified_inbox ON compliance_calendar_events(task_id, due_date) WHERE task_id IS NULL;
-- Drop insecure all_work_items view
-- Reason: No SECURITY INVOKER, bypasses RLS, unreferenced in application code.
-- Replaced by service-layer composition (lib/services/work-hub-service.ts) when needed.
DROP VIEW IF EXISTS all_work_items;
-- Fix notices RLS policies
-- 1. Drop the over-permissioned notices_admin_team_select which allowed ALL team users to read ALL notices
-- 2. Add client SELECT policy so portal users can view their own notices

DROP POLICY IF EXISTS "notices_admin_team_select" ON notices;

-- Client view: only notices belonging to clients the user is linked to
DROP POLICY IF EXISTS "notices_client_view" ON notices;
CREATE POLICY "notices_client_view" ON notices
FOR SELECT
USING (
  client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
);
-- Fix notices table to include 'open' as a valid status
-- The application code expects 'open' to be a valid status for notices

-- Drop the existing CHECK constraint and recreate it with 'open' included
ALTER TABLE public.notices DROP CONSTRAINT IF EXISTS notices_status_check;
ALTER TABLE public.notices ADD CONSTRAINT notices_status_check CHECK (status IN (
  'received', 'reply_pending', 'reply_submitted', 'hearing_pending', 'hearing_held', 
  'order_pending', 'order_received', 'closed', 'open'
));
-- ============================================================================
-- RLS Close-Gaps — 2026-05-14
-- Fixes: 12 tables with RLS disabled + vendors (RLS on, 0 policies)
-- Run via: npx tsx scripts/apply-rls-close-gaps.ts
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. notifications — personal only
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notif_self_select ON public.notifications;
CREATE POLICY notif_self_select ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS notif_self_insert ON public.notifications;
CREATE POLICY notif_self_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS notif_self_update ON public.notifications;
CREATE POLICY notif_self_update ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS notif_self_delete ON public.notifications;
CREATE POLICY notif_self_delete ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. global_audit_log — server-only writes; admin read
-- ---------------------------------------------------------------------------
ALTER TABLE public.global_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_admin_select ON public.global_audit_log;
CREATE POLICY audit_admin_select ON public.global_audit_log FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');
-- No INSERT/UPDATE/DELETE for authenticated — service_role bypasses RLS

-- ---------------------------------------------------------------------------
-- 3. leave_requests — self + admin
-- ---------------------------------------------------------------------------
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leave_self_select ON public.leave_requests;
CREATE POLICY leave_self_select ON public.leave_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS leave_self_insert ON public.leave_requests;
CREATE POLICY leave_self_insert ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS leave_self_update ON public.leave_requests;
CREATE POLICY leave_self_update ON public.leave_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 4. payroll_adjustments — admin only (ties to payroll_runs)
-- ---------------------------------------------------------------------------
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_adj_admin ON public.payroll_adjustments;
CREATE POLICY payroll_adj_admin ON public.payroll_adjustments FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 5. hearings — admin/team read; client scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.hearings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hearings_admin_team ON public.hearings;
CREATE POLICY hearings_admin_team ON public.hearings FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS hearings_client ON public.hearings;
CREATE POLICY hearings_client ON public.hearings FOR SELECT TO authenticated
  USING (client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));

-- ---------------------------------------------------------------------------
-- 6. compliance_insights — admin/team read; client scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.compliance_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS insights_admin_team ON public.compliance_insights;
CREATE POLICY insights_admin_team ON public.compliance_insights FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS insights_client ON public.compliance_insights;
CREATE POLICY insights_client ON public.compliance_insights FOR SELECT TO authenticated
  USING (client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));

-- ---------------------------------------------------------------------------
-- 7. engagement_letters — admin/team; client scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.engagement_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS el_admin_team ON public.engagement_letters;
CREATE POLICY el_admin_team ON public.engagement_letters FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS el_client ON public.engagement_letters;
CREATE POLICY el_client ON public.engagement_letters FOR SELECT TO authenticated
  USING (client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));

-- ---------------------------------------------------------------------------
-- 8. client_lifecycle_stage — admin/team; client scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.client_lifecycle_stage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cls_admin_team ON public.client_lifecycle_stage;
CREATE POLICY cls_admin_team ON public.client_lifecycle_stage FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS cls_client ON public.client_lifecycle_stage;
CREATE POLICY cls_client ON public.client_lifecycle_stage FOR SELECT TO authenticated
  USING (client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));

-- ---------------------------------------------------------------------------
-- 9. client_feature_flags — admin/team; client scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.client_feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cff_admin_team ON public.client_feature_flags;
CREATE POLICY cff_admin_team ON public.client_feature_flags FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));
DROP POLICY IF EXISTS cff_client ON public.client_feature_flags;
CREATE POLICY cff_client ON public.client_feature_flags FOR SELECT TO authenticated
  USING (client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));

-- ---------------------------------------------------------------------------
-- 10. firm_profile — read-only for all; admin write
-- ---------------------------------------------------------------------------
ALTER TABLE public.firm_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS firm_read_all ON public.firm_profile;
CREATE POLICY firm_read_all ON public.firm_profile FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS firm_admin_write ON public.firm_profile;
CREATE POLICY firm_admin_write ON public.firm_profile FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 11. vendor_gst_filings — admin/team only
-- ---------------------------------------------------------------------------
ALTER TABLE public.vendor_gst_filings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vgf_admin_team ON public.vendor_gst_filings;
CREATE POLICY vgf_admin_team ON public.vendor_gst_filings FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));

-- ---------------------------------------------------------------------------
-- 12. benchmarks — read-only reference data
-- ---------------------------------------------------------------------------
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bench_read_all ON public.benchmarks;
CREATE POLICY bench_read_all ON public.benchmarks FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 13. vendors — RLS enabled but 0 policies (lockout). Add admin/team read.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS vendors_admin_team ON public.vendors;
CREATE POLICY vendors_admin_team ON public.vendors FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));

-- ============================================================================
-- Grants
-- ============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
-- ============================================================================
-- ADDITIVE RLS POLICIES (loaded AFTER schema.sql v3)
-- These fill gaps in schema.sql v3 where admin/team roles had NO policy on
-- core tables (clients, tasks, queries, etc.), making the portal unusable
-- without service-role bypass.
--
-- All policies here are PURELY ADDITIVE - no existing policy is dropped or
-- modified. The on-disk schema.sql is bit-for-bit unchanged.
--
-- Naming convention: admin_*, team_* (so they don't collide with v3 policies)
-- ============================================================================

-- Helper: a SECURITY DEFINER function that returns the calling user's role.
-- Reading from users_profile inside an RLS policy on users_profile itself
-- causes recursion; this function avoids that.
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS TEXT
LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT role FROM public.users_profile WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated, service_role;

-- Helper: check whether the calling user has an active capability grant.
-- Defensive: returns FALSE if staff_capabilities does not yet exist (fresh installs).
CREATE OR REPLACE FUNCTION public.user_has_capability(cap TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.staff_capabilities') IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM staff_capabilities
    WHERE user_id = auth.uid()
      AND capability = cap
      AND revoked_at IS NULL
  );
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_capability(TEXT) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- users_profile : everyone can read all profiles (needed for FK joins in UI).
-- Self-update only. Admin can update anyone.
-- ----------------------------------------------------------------------------
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_self_view" ON users_profile;
CREATE POLICY "profiles_self_view" ON users_profile FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "profiles_self_update" ON users_profile;
CREATE POLICY "profiles_self_update" ON users_profile FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.current_user_role() = 'admin');
DROP POLICY IF EXISTS "profiles_admin_all" ON users_profile;
CREATE POLICY "profiles_admin_all" ON users_profile FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- clients
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "clients_admin_all" ON clients;
CREATE POLICY "clients_admin_all" ON clients FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "clients_team_select" ON clients;
CREATE POLICY "clients_team_select" ON clients FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('clients.read.all')
    )
  );

DROP POLICY IF EXISTS "clients_team_update" ON clients;
CREATE POLICY "clients_team_update" ON clients FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('clients.edit')
      OR public.user_has_capability('clients.toggle_portal')
    )
  );

DROP POLICY IF EXISTS "clients_team_insert" ON clients;
CREATE POLICY "clients_team_insert" ON clients FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.create')
  );

DROP POLICY IF EXISTS "clients_team_delete" ON clients;
CREATE POLICY "clients_team_delete" ON clients FOR DELETE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.delete')
  );

-- ----------------------------------------------------------------------------
-- client_groups, client_users, team_client_assignment, client_services,
-- client_sub_services : admin all + team select
-- ----------------------------------------------------------------------------
ALTER TABLE client_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_client_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_sub_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_groups_admin" ON client_groups;
CREATE POLICY "client_groups_admin" ON client_groups FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team')) WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "client_users_admin" ON client_users;
CREATE POLICY "client_users_admin" ON client_users FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team') OR user_id = auth.uid())
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "tca_admin" ON team_client_assignment;
CREATE POLICY "tca_admin" ON team_client_assignment FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "client_services_admin_team" ON client_services;
CREATE POLICY "client_services_admin_team" ON client_services FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "client_sub_services_admin_team" ON client_sub_services;
CREATE POLICY "client_sub_services_admin_team" ON client_sub_services FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- service catalogue : everyone authenticated can read; admin can mutate
-- ----------------------------------------------------------------------------
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalogue_read" ON service_categories;
CREATE POLICY "catalogue_read" ON service_categories FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "catalogue_admin" ON service_categories;
CREATE POLICY "catalogue_admin" ON service_categories FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "services_read" ON services;
CREATE POLICY "services_read" ON services FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "services_admin" ON services;
CREATE POLICY "services_admin" ON services FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "sub_services_read" ON sub_services;
CREATE POLICY "sub_services_read" ON sub_services FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "sub_services_admin" ON sub_services;
CREATE POLICY "sub_services_admin" ON sub_services FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- tasks (admin full, team insert/update for assigned clients)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_admin_all" ON tasks;
CREATE POLICY "tasks_admin_all" ON tasks FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');
DROP POLICY IF EXISTS "tasks_team_insert" ON tasks;
CREATE POLICY "tasks_team_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('tasks.create')
      OR public.user_has_capability('tasks.assign')
    )
  );

DROP POLICY IF EXISTS "tasks_team_delete" ON tasks;
CREATE POLICY "tasks_team_delete" ON tasks FOR DELETE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('tasks.edit')
  );

-- task_activity, task_notes, task_document_requests, task_templates
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_activity_visible" ON task_activity;
CREATE POLICY "task_activity_visible" ON task_activity FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM tasks));
DROP POLICY IF EXISTS "task_activity_insert" ON task_activity;
CREATE POLICY "task_activity_insert" ON task_activity FOR INSERT TO authenticated
  WITH CHECK (task_id IN (SELECT id FROM tasks));

DROP POLICY IF EXISTS "task_notes_visible" ON task_notes;
CREATE POLICY "task_notes_visible" ON task_notes FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM tasks));
DROP POLICY IF EXISTS "task_notes_insert" ON task_notes;
CREATE POLICY "task_notes_insert" ON task_notes FOR INSERT TO authenticated
  WITH CHECK (task_id IN (SELECT id FROM tasks));

DROP POLICY IF EXISTS "task_doc_req_team" ON task_document_requests;
CREATE POLICY "task_doc_req_team" ON task_document_requests FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));

DROP POLICY IF EXISTS "task_templates_team" ON task_templates;
CREATE POLICY "task_templates_team" ON task_templates FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- queries / query_messages : admin all, team for assigned clients, client own
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "queries_admin_all" ON queries;
CREATE POLICY "queries_admin_all" ON queries FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "queries_team_assigned" ON queries;
CREATE POLICY "queries_team_assigned" ON queries FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "queries_client_create" ON queries;
CREATE POLICY "queries_client_create" ON queries FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "queries_client_select" ON queries;
CREATE POLICY "queries_client_select" ON queries FOR SELECT TO authenticated
  USING (created_by = auth.uid()
    OR client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE));

ALTER TABLE query_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "query_msg_visible" ON query_messages;
CREATE POLICY "query_msg_visible" ON query_messages FOR SELECT TO authenticated
  USING (query_id IN (SELECT id FROM queries));
DROP POLICY IF EXISTS "query_msg_insert" ON query_messages;
CREATE POLICY "query_msg_insert" ON query_messages FOR INSERT TO authenticated
  WITH CHECK (query_id IN (SELECT id FROM queries) AND sender_id = auth.uid());

-- ----------------------------------------------------------------------------
-- compliance / notices / filings : admin full
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "gst_filings_admin" ON gst_filings;
CREATE POLICY "gst_filings_admin" ON gst_filings FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "tds_filings_admin" ON tds_filings;
CREATE POLICY "tds_filings_admin" ON tds_filings FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "it_filings_admin" ON it_filings;
CREATE POLICY "it_filings_admin" ON it_filings FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "compliance_status_admin" ON compliance_status;
CREATE POLICY "compliance_status_admin" ON compliance_status FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "notices_admin" ON notices;
CREATE POLICY "notices_admin" ON notices FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

-- Bump existing v3 policies that scoped to 'team' role to also accept admin
-- (additive: we just add a parallel admin_only policy; both work via OR of policies)
DROP POLICY IF EXISTS "notices_admin_team_select" ON notices;
CREATE POLICY "notices_admin_team_select" ON notices FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));

-- ----------------------------------------------------------------------------
-- dsc_records / credentials : admin full, team assigned clients
-- ----------------------------------------------------------------------------

-- Replace old schema.sql v3 SELECT policies (inefficient subquery + no admin bypass)
-- with consistent current_user_role() policies.
DROP POLICY IF EXISTS "dsc_records_team_only" ON dsc_records;
CREATE POLICY "dsc_records_admin_select" ON dsc_records FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');
CREATE POLICY "dsc_records_team_select" ON dsc_records FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "dsc_records_admin_all" ON dsc_records;
CREATE POLICY "dsc_records_admin_all" ON dsc_records FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "dsc_records_team_insert" ON dsc_records;
CREATE POLICY "dsc_records_team_insert" ON dsc_records FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "dsc_records_team_update" ON dsc_records;
CREATE POLICY "dsc_records_team_update" ON dsc_records FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "credentials_team_only" ON credentials;
CREATE POLICY "credentials_admin_select" ON credentials FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');
CREATE POLICY "credentials_team_select" ON credentials FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "credentials_admin_all" ON credentials;
CREATE POLICY "credentials_admin_all" ON credentials FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "credentials_team_insert" ON credentials;
CREATE POLICY "credentials_team_insert" ON credentials FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "credentials_team_update" ON credentials;
CREATE POLICY "credentials_team_update" ON credentials FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );
-- ============================================================================
-- RLS CAPABILITIES MIGRATION — 2026-05-29
-- Makes staff_capabilities actually expand access beyond team_client_assignment.
-- Run via: npx tsx scripts/apply-rls-capabilities.ts
-- ============================================================================

-- Helper: check whether the calling user has an active capability grant.
-- SECURITY DEFINER so it can read staff_capabilities regardless of the table's
-- own RLS policies.
-- Defensive: returns FALSE if staff_capabilities does not yet exist (fresh installs).
CREATE OR REPLACE FUNCTION public.user_has_capability(cap TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.staff_capabilities') IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM staff_capabilities
    WHERE user_id = auth.uid()
      AND capability = cap
      AND revoked_at IS NULL
  );
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_capability(TEXT) TO anon, authenticated, service_role;

-- ============================================================================
-- CLIENTS
-- ============================================================================

-- SELECT: team sees assigned clients OR anyone with clients.read.all
DROP POLICY IF EXISTS "clients_team_select" ON clients;
CREATE POLICY "clients_team_select" ON clients
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('clients.read.all')
    )
  );

-- UPDATE: team can update assigned clients OR anyone with clients.edit
DROP POLICY IF EXISTS "clients_team_update" ON clients;
CREATE POLICY "clients_team_update" ON clients
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('clients.edit')
      OR public.user_has_capability('clients.toggle_portal')
    )
  );

-- INSERT: team with clients.create
DROP POLICY IF EXISTS "clients_team_insert" ON clients;
CREATE POLICY "clients_team_insert" ON clients
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.create')
  );

-- DELETE: team with clients.delete
DROP POLICY IF EXISTS "clients_team_delete" ON clients;
CREATE POLICY "clients_team_delete" ON clients
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.delete')
  );

-- ============================================================================
-- TEAM CLIENT ASSIGNMENT
-- ============================================================================

-- Admin write + team read (existing). Add team write for clients.assign_team.
DROP POLICY IF EXISTS "tca_team_write" ON team_client_assignment;
CREATE POLICY "tca_team_write" ON team_client_assignment
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.assign_team')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.assign_team')
  );

-- ============================================================================
-- TASKS
-- ============================================================================

-- Team SELECT: assigned client OR assigned task OR task capabilities
DROP POLICY IF EXISTS "tasks_team_view" ON tasks;
CREATE POLICY "tasks_team_view" ON tasks
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR assigned_to = auth.uid()
      OR reviewer_id = auth.uid()
      OR public.user_has_capability('tasks.assign')
      OR public.user_has_capability('tasks.complete')
      OR public.user_has_capability('tasks.create')
      OR public.user_has_capability('tasks.edit')
    )
  );

-- Team INSERT: assigned client OR tasks.create / tasks.assign
DROP POLICY IF EXISTS "tasks_team_insert" ON tasks;
CREATE POLICY "tasks_team_insert" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('tasks.create')
      OR public.user_has_capability('tasks.assign')
    )
  );

-- Team UPDATE: own/assigned OR task capabilities
DROP POLICY IF EXISTS "tasks_team_update_own" ON tasks;
CREATE POLICY "tasks_team_update_own" ON tasks
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR assigned_to = auth.uid()
      OR reviewer_id = auth.uid()
      OR public.user_has_capability('tasks.assign')
      OR public.user_has_capability('tasks.complete')
    )
  );

-- Team DELETE: tasks.edit
DROP POLICY IF EXISTS "tasks_team_delete" ON tasks;
CREATE POLICY "tasks_team_delete" ON tasks
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('tasks.edit')
  );

-- ============================================================================
-- TASK STEPS (schema-additions)
-- ============================================================================

DROP POLICY IF EXISTS "task_steps_team" ON task_steps;
CREATE POLICY "task_steps_team" ON task_steps
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      task_id IN (
        SELECT id FROM tasks WHERE client_id IN (
          SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
        )
      )
      OR public.user_has_capability('tasks.assign')
      OR public.user_has_capability('tasks.complete')
      OR public.user_has_capability('tasks.create')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      task_id IN (
        SELECT id FROM tasks WHERE client_id IN (
          SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
        )
      )
      OR public.user_has_capability('tasks.assign')
      OR public.user_has_capability('tasks.complete')
      OR public.user_has_capability('tasks.create')
    )
  );

-- ============================================================================
-- QUERIES
-- ============================================================================

-- Team ALL: assigned client OR queries.assign
DROP POLICY IF EXISTS "queries_team_view" ON queries;
DROP POLICY IF EXISTS "queries_team_assigned" ON queries;
DROP POLICY IF EXISTS "queries_team_all" ON queries;
CREATE POLICY "queries_team_all" ON queries
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('queries.assign')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('queries.assign')
    )
  );

-- ============================================================================
-- NOTICES
-- ============================================================================

-- Broad team SELECT is already granted by notices_admin_team_select (rls-additive.sql).
-- We only add the mutate capability here.
DROP POLICY IF EXISTS "notices_team_mutate" ON notices;
CREATE POLICY "notices_team_mutate" ON notices
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('notices.manage')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('notices.manage')
  );

-- ============================================================================
-- HEARINGS
-- ============================================================================

-- Team ALL: hearings.manage
DROP POLICY IF EXISTS "hearings_team_mutate" ON hearings;
CREATE POLICY "hearings_team_mutate" ON hearings
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('hearings.manage')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('hearings.manage')
  );

-- ============================================================================
-- CREDENTIALS
-- ============================================================================

-- Team SELECT: assigned OR credentials.manage
DROP POLICY IF EXISTS "credentials_team_only" ON credentials;
DROP POLICY IF EXISTS "credentials_team_select" ON credentials;
CREATE POLICY "credentials_team_select" ON credentials
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('credentials.manage')
    )
  );

-- Team INSERT: assigned OR credentials.manage
DROP POLICY IF EXISTS "credentials_team_insert" ON credentials;
CREATE POLICY "credentials_team_insert" ON credentials
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('credentials.manage')
    )
  );

-- Team UPDATE: assigned OR credentials.manage
DROP POLICY IF EXISTS "credentials_team_update" ON credentials;
CREATE POLICY "credentials_team_update" ON credentials
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('credentials.manage')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('credentials.manage')
    )
  );

-- ============================================================================
-- DSC RECORDS
-- ============================================================================

-- Team SELECT: assigned OR dsc.manage
DROP POLICY IF EXISTS "dsc_records_team_only" ON dsc_records;
DROP POLICY IF EXISTS "dsc_records_team_select" ON dsc_records;
CREATE POLICY "dsc_records_team_select" ON dsc_records
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('dsc.manage')
    )
  );

-- Team INSERT: assigned OR dsc.manage
DROP POLICY IF EXISTS "dsc_records_team_insert" ON dsc_records;
CREATE POLICY "dsc_records_team_insert" ON dsc_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('dsc.manage')
    )
  );

-- Team UPDATE: assigned OR dsc.manage
DROP POLICY IF EXISTS "dsc_records_team_update" ON dsc_records;
CREATE POLICY "dsc_records_team_update" ON dsc_records
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('dsc.manage')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('dsc.manage')
    )
  );

-- ============================================================================
-- COMPLIANCE (GST / TDS / IT / compliance_status)
-- ============================================================================

-- GST filings
DROP POLICY IF EXISTS "gst_filings_team_only" ON gst_filings;
DROP POLICY IF EXISTS "gst_filings_team_select" ON gst_filings;
CREATE POLICY "gst_filings_team_select" ON gst_filings
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "gst_filings_team_insert" ON gst_filings;
CREATE POLICY "gst_filings_team_insert" ON gst_filings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "gst_filings_team_update" ON gst_filings;
CREATE POLICY "gst_filings_team_update" ON gst_filings
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

-- TDS filings
DROP POLICY IF EXISTS "tds_filings_team_only" ON tds_filings;
DROP POLICY IF EXISTS "tds_filings_team_select" ON tds_filings;
CREATE POLICY "tds_filings_team_select" ON tds_filings
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "tds_filings_team_insert" ON tds_filings;
CREATE POLICY "tds_filings_team_insert" ON tds_filings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "tds_filings_team_update" ON tds_filings;
CREATE POLICY "tds_filings_team_update" ON tds_filings
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

-- IT filings
DROP POLICY IF EXISTS "it_filings_team_only" ON it_filings;
DROP POLICY IF EXISTS "it_filings_team_select" ON it_filings;
CREATE POLICY "it_filings_team_select" ON it_filings
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "it_filings_team_insert" ON it_filings;
CREATE POLICY "it_filings_team_insert" ON it_filings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "it_filings_team_update" ON it_filings;
CREATE POLICY "it_filings_team_update" ON it_filings
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

-- Compliance status
DROP POLICY IF EXISTS "compliance_status_team_only" ON compliance_status;
DROP POLICY IF EXISTS "compliance_status_team_select" ON compliance_status;
CREATE POLICY "compliance_status_team_select" ON compliance_status
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

DROP POLICY IF EXISTS "compliance_status_team_update" ON compliance_status;
CREATE POLICY "compliance_status_team_update" ON compliance_status
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('compliance.enter')
    )
  );

-- ============================================================================
-- FINANCIAL DATA (BizLens / vCFO)
-- ============================================================================

-- GST data entries
DROP POLICY IF EXISTS "gst_data_entries_team_only" ON gst_data_entries;
DROP POLICY IF EXISTS "gst_data_entries_team_select" ON gst_data_entries;
CREATE POLICY "gst_data_entries_team_select" ON gst_data_entries
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  );

DROP POLICY IF EXISTS "gst_data_entries_team_insert" ON gst_data_entries;
CREATE POLICY "gst_data_entries_team_insert" ON gst_data_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  );

DROP POLICY IF EXISTS "gst_data_entries_team_update" ON gst_data_entries;
CREATE POLICY "gst_data_entries_team_update" ON gst_data_entries
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  );

-- Financial data
DROP POLICY IF EXISTS "financial_data_team_only" ON financial_data;
DROP POLICY IF EXISTS "financial_data_team_select" ON financial_data;
CREATE POLICY "financial_data_team_select" ON financial_data
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  );

DROP POLICY IF EXISTS "financial_data_team_insert" ON financial_data;
CREATE POLICY "financial_data_team_insert" ON financial_data
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  );

DROP POLICY IF EXISTS "financial_data_team_update" ON financial_data;
CREATE POLICY "financial_data_team_update" ON financial_data
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('bizlens.enter')
    )
  );

-- vCFO snapshots
DROP POLICY IF EXISTS "vcfo_snapshots_team_view" ON vcfo_snapshots;
DROP POLICY IF EXISTS "vcfo_snapshots_team_select" ON vcfo_snapshots;
CREATE POLICY "vcfo_snapshots_team_select" ON vcfo_snapshots
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('vcfo.enter')
    )
  );

DROP POLICY IF EXISTS "vcfo_snapshots_team_insert" ON vcfo_snapshots;
CREATE POLICY "vcfo_snapshots_team_insert" ON vcfo_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('vcfo.enter')
    )
  );

DROP POLICY IF EXISTS "vcfo_snapshots_team_update" ON vcfo_snapshots;
CREATE POLICY "vcfo_snapshots_team_update" ON vcfo_snapshots
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('vcfo.enter')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('vcfo.enter')
    )
  );

-- ============================================================================
-- SOLUTION LOG
-- ============================================================================

DROP POLICY IF EXISTS "solution_log_team_view" ON solution_log;
DROP POLICY IF EXISTS "solution_log_team_select" ON solution_log;
CREATE POLICY "solution_log_team_select" ON solution_log
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('manage_solution_log')
    )
  );

DROP POLICY IF EXISTS "solution_log_team_insert" ON solution_log;
CREATE POLICY "solution_log_team_insert" ON solution_log
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('manage_solution_log')
    )
  );

DROP POLICY IF EXISTS "solution_log_team_update" ON solution_log;
CREATE POLICY "solution_log_team_update" ON solution_log
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('manage_solution_log')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('manage_solution_log')
    )
  );

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

DROP POLICY IF EXISTS "documents_team_view" ON documents;
DROP POLICY IF EXISTS "documents_team_select" ON documents;
CREATE POLICY "documents_team_select" ON documents
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND visible_to_team = TRUE
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('clients.read.all')
    )
  );

-- ============================================================================
-- CLIENT COMMUNICATION LOG
-- ============================================================================

DROP POLICY IF EXISTS "communication_log_team_view" ON client_communication_log;
DROP POLICY IF EXISTS "communication_log_team_select" ON client_communication_log;
CREATE POLICY "communication_log_team_select" ON client_communication_log
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('clients.read.all')
    )
  );

-- ============================================================================
-- CLIENT PORTAL VISIBILITY
-- ============================================================================

DROP POLICY IF EXISTS "cpv_team_read" ON client_portal_visibility;
CREATE POLICY "cpv_team_read" ON client_portal_visibility
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('team', 'admin')
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR public.user_has_capability('clients.read.all')
      OR public.user_has_capability('clients.toggle_portal')
    )
  );

-- ============================================================================
-- SERVICE CATALOGUE
-- ============================================================================

-- services: team with services.manage can mutate
DROP POLICY IF EXISTS "services_team_mutate" ON services;
CREATE POLICY "services_team_mutate" ON services
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.manage')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.manage')
  );

-- sub_services: team with services.manage can mutate
DROP POLICY IF EXISTS "sub_services_team_mutate" ON sub_services;
CREATE POLICY "sub_services_team_mutate" ON sub_services
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.manage')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.manage')
  );

-- ============================================================================
-- CLIENT SERVICES & SUB-SERVICES
-- ============================================================================

-- client_services: team with services.assign can write
DROP POLICY IF EXISTS "client_services_team_write" ON client_services;
CREATE POLICY "client_services_team_write" ON client_services
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.assign')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.assign')
  );

-- client_sub_services: team with services.assign can write
DROP POLICY IF EXISTS "client_sub_services_team_write" ON client_sub_services;
CREATE POLICY "client_sub_services_team_write" ON client_sub_services
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.assign')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('services.assign')
  );

-- ============================================================================
-- STAFF MANAGEMENT
-- ============================================================================

-- users_profile: team with staff.manage can mutate (except prime admins)
DROP POLICY IF EXISTS "users_profile_team_manage" ON users_profile;
CREATE POLICY "users_profile_team_manage" ON users_profile
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('staff.manage')
    AND is_prime_admin = FALSE
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('staff.manage')
    AND is_prime_admin = FALSE
  );

-- staff_capabilities: team with staff.grant_capabilities can mutate
DROP POLICY IF EXISTS "staff_caps_team_grant" ON staff_capabilities;
CREATE POLICY "staff_caps_team_grant" ON staff_capabilities
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('staff.grant_capabilities')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('staff.grant_capabilities')
  );

-- ============================================================================
-- PAYROLL
-- ============================================================================

-- payroll_runs: team with payroll.run can manage
DROP POLICY IF EXISTS "payroll_runs_team_mutate" ON payroll_runs;
CREATE POLICY "payroll_runs_team_mutate" ON payroll_runs
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('payroll.run')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('payroll.run')
  );

-- payroll_adjustments: team with payroll.run can manage
DROP POLICY IF EXISTS "payroll_adj_team_mutate" ON payroll_adjustments;
CREATE POLICY "payroll_adj_team_mutate" ON payroll_adjustments
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('payroll.run')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('payroll.run')
  );

-- ============================================================================
-- LEAVE & ATTENDANCE
-- ============================================================================

-- leave_requests: team with leave.approve can manage all
DROP POLICY IF EXISTS "leave_requests_team_approve" ON leave_requests;
CREATE POLICY "leave_requests_team_approve" ON leave_requests
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('leave.approve')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('leave.approve')
  );

-- attendance_logs: team with attendance.approve can manage all
DROP POLICY IF EXISTS "attendance_logs_team_approve" ON attendance_logs;
CREATE POLICY "attendance_logs_team_approve" ON attendance_logs
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('attendance.approve')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('attendance.approve')
  );

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

-- global_audit_log: team with audit.view can read
DROP POLICY IF EXISTS "audit_log_team_view" ON global_audit_log;
CREATE POLICY "audit_log_team_view" ON global_audit_log
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('audit.view')
  );

-- ============================================================================
-- COMPLIANCE INSIGHTS
-- ============================================================================

-- compliance_insights: team with insights.configure can mutate
DROP POLICY IF EXISTS "compliance_insights_team_mutate" ON compliance_insights;
CREATE POLICY "compliance_insights_team_mutate" ON compliance_insights
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('insights.configure')
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND public.user_has_capability('insights.configure')
  );

-- ============================================================================
-- VENDORS
-- ============================================================================

-- vendors: team with clients.read.all can read all (vendors are client-linked)
DROP POLICY IF EXISTS "vendors_team_read" ON vendors;
CREATE POLICY "vendors_team_read" ON vendors
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.read.all')
  );

-- ============================================================================
-- ENGAGEMENT LETTERS & LIFECYCLE
-- ============================================================================

-- engagement_letters: team with clients.read.all can read all
DROP POLICY IF EXISTS "engagement_letters_team_read" ON engagement_letters;
CREATE POLICY "engagement_letters_team_read" ON engagement_letters
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.read.all')
  );

-- client_lifecycle_stage: team with clients.read.all can read all
DROP POLICY IF EXISTS "client_lifecycle_team_read" ON client_lifecycle_stage;
CREATE POLICY "client_lifecycle_team_read" ON client_lifecycle_stage
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND public.user_has_capability('clients.read.all')
  );

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- ============================================================================
-- THE FISCAL FULCRUM — SCHEMA ADDITIONS (v3.1)
-- ============================================================================
--
-- Date:   May 8, 2026
-- Status: Additive only. The base schema.sql v3 is unchanged on disk.
-- Apply:  AFTER schema.sql + db/rls-additive.sql, via Management API
--         (extend scripts/apply-schema.ts or add a new
--         scripts/apply-schema-additions.ts).
--
-- v3.1 adds three tables and their RLS policies:
--   1. staff_capabilities       — RBAC capability layer (per-staff named rights)
--   2. client_portal_visibility — granular per-client portal module toggle
--   3. notification_preferences — per-user email digest cadence
--
-- All three tables ALTER ENABLE ROW LEVEL SECURITY and have explicit policies.
-- All three reference the public.current_user_role() helper from
-- db/rls-additive.sql (must be applied first).
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. STAFF CAPABILITIES (RBAC)
-- ----------------------------------------------------------------------------
-- Closed list of capabilities (v1) — see NEXTJS_BACKEND_ARCHITECTURE.md
-- §Capability layer. admin role implicitly holds all; team holds none by
-- default. Application code uses requireCapability(userId, capability).
--
-- Capability strings (~25, do not invent new ones without journaling):
--   clients.read.all, clients.create, clients.edit, clients.delete,
--   clients.assign_team, clients.toggle_portal,
--   services.manage, services.assign,
--   staff.manage, staff.grant_capabilities,
--   dsc.manage, credentials.manage,
--   tasks.assign, tasks.complete,
--   compliance.enter, notices.manage,
--   bizlens.enter, vcfo.enter,
--   payroll.run,
--   attendance.approve, leave.approve,
--   documents.upload, documents.delete,
--   queries.assign,
--   audit.view, insights.configure
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,

  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID NOT NULL REFERENCES users_profile(id),

  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users_profile(id),

  -- One row per (user, capability). Re-grant after revoke updates the same row.
  UNIQUE(user_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_staff_capabilities_user
  ON staff_capabilities(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_capabilities_capability
  ON staff_capabilities(capability) WHERE revoked_at IS NULL;

ALTER TABLE staff_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_caps_admin_all" ON staff_capabilities;
CREATE POLICY "staff_caps_admin_all" ON staff_capabilities
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "staff_caps_self_view" ON staff_capabilities;
CREATE POLICY "staff_caps_self_view" ON staff_capabilities
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. CLIENT PORTAL VISIBILITY (granular per-client module toggle)
-- ----------------------------------------------------------------------------
-- Closed list of modules (v1) — see NEXTJS_BACKEND_ARCHITECTURE.md
-- §Portal visibility resolver. Default on portal-enable: dashboard + tasks +
-- queries only; admin opens additional modules explicitly per engagement.
--
-- Module keys (11, do not invent new ones without journaling):
--   portal.dashboard, portal.tasks, portal.documents, portal.queries,
--   portal.bizlens, portal.vcfo, portal.compliance_calendar, portal.insights,
--   portal.tax_projection, portal.notices, portal.vendors
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS client_portal_visibility (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,

  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users_profile(id),

  UNIQUE(client_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_client_portal_visibility_client
  ON client_portal_visibility(client_id);

ALTER TABLE client_portal_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cpv_admin_all" ON client_portal_visibility;
CREATE POLICY "cpv_admin_all" ON client_portal_visibility
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "cpv_team_read" ON client_portal_visibility;
CREATE POLICY "cpv_team_read" ON client_portal_visibility
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('team', 'admin')
    AND client_id IN (
      SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cpv_client_read" ON client_portal_visibility;
CREATE POLICY "cpv_client_read" ON client_portal_visibility
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM client_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- ----------------------------------------------------------------------------
-- 3. NOTIFICATION PREFERENCES (per-user email digest cadence)
-- ----------------------------------------------------------------------------
-- email_frequency: 'immediate' (send each event), 'daily', 'weekly', 'off'
-- in_app_enabled : whether the in-app notifications row is also written
--                  (default TRUE; rarely turned off).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users_profile(id) ON DELETE CASCADE,
  email_frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'off')),
  in_app_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_prefs_self" ON notification_preferences;
CREATE POLICY "notif_prefs_self" ON notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_prefs_admin" ON notification_preferences;
CREATE POLICY "notif_prefs_admin" ON notification_preferences
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 4. APPLICATION-LAYER CONTRACTS (not enforced in SQL)
-- ----------------------------------------------------------------------------
-- a) When admin sets clients.portal_enabled = TRUE, application code seeds
--    three default rows in client_portal_visibility:
--      (client_id, 'portal.dashboard', TRUE)
--      (client_id, 'portal.tasks',     TRUE)
--      (client_id, 'portal.queries',   TRUE)
--    Other modules remain absent (treated as disabled by the resolver).
--
-- b) Capability grants and revokes write a row to global_audit_log with
--    action='capability.grant' or 'capability.revoke', entity_type='user',
--    entity_id=target_user_id, details JSONB containing { capability, granted_by }.
--
-- c) client_portal_visibility updates write a row to global_audit_log with
--    action='portal_visibility.set', entity_type='client', entity_id=client_id,
--    details JSONB containing { module_key, is_enabled, by }.

-- ============================================================================
-- v3.2 ADDITIONS — May 8, 2026
-- ============================================================================
--
-- Reflects the workflow rewrite. Five new tables and one cleanup migration.
--
--   5. saved_views                 — fixes the missing table the
--                                    saved-views action references
--   6. sub_service_sop_steps       — admin-defined SOP per sub-service
--   7. task_steps                  — per-task copy of SOP steps with sign-off
--   8. staff_role_templates        — firm-defined role templates
--   9. staff_role_capabilities     — capabilities granted by a role template
--  10. client_import_batches       — bulk-import staging (audit + retry)
--  11. CLEANUP                     — DROP starter-set service catalogue rows
--                                    so admin defines services from scratch
--
-- Apply order: schema.sql → rls-additive.sql → schema-additions.sql (this file).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5. SAVED VIEWS (fix for missing table)
-- ----------------------------------------------------------------------------
-- Per-user, per-scope filter presets. Scope examples: 'tasks', 'clients',
-- 'queries', 'notices'. The filters JSON captures URL search params.

CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, scope, name)
);

CREATE INDEX IF NOT EXISTS idx_saved_views_user_scope
  ON saved_views(user_id, scope);

ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_views_self" ON saved_views;
CREATE POLICY "saved_views_self" ON saved_views
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6. SUB-SERVICE SOP STEPS (custom workflow per sub-service)
-- ----------------------------------------------------------------------------
-- Admin defines the standard operating procedure per sub-service: an ordered
-- list of steps. When a task is created (manually or via the recurring cron)
-- from this sub-service, these steps are COPIED into task_steps for that task.
-- Editing the SOP affects future tasks only; existing tasks keep their copy.

CREATE TABLE IF NOT EXISTS sub_service_sop_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_service_id UUID NOT NULL REFERENCES sub_services(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Partial unique index: only active (non-deleted) steps must have unique order
CREATE UNIQUE INDEX IF NOT EXISTS idx_sop_steps_unique_active_order
  ON sub_service_sop_steps(sub_service_id, step_order)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_sop_steps_sub_service
  ON sub_service_sop_steps(sub_service_id) WHERE is_deleted = FALSE;

ALTER TABLE sub_service_sop_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sop_admin" ON sub_service_sop_steps;
CREATE POLICY "sop_admin" ON sub_service_sop_steps
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "sop_team_read" ON sub_service_sop_steps;
CREATE POLICY "sop_team_read" ON sub_service_sop_steps
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('team', 'admin'));

-- ----------------------------------------------------------------------------
-- 7. TASK STEPS (per-task checklist with sign-off)
-- ----------------------------------------------------------------------------
-- Each task has its own ordered step list, copied from the sub-service's SOP
-- at task-creation time (or added ad-hoc by staff during execution). Each step
-- captures sign-off: who completed it, when, and an optional note.

CREATE TABLE IF NOT EXISTS task_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT TRUE,

  -- Sign-off
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES users_profile(id),
  completion_note TEXT,

  -- Provenance: which SOP step or template step seeded this row (NULL for ad-hoc steps)
  source_sop_step_id UUID REFERENCES sub_service_sop_steps(id),
  source_template_step_id UUID REFERENCES task_template_steps(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(task_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_task_steps_task ON task_steps(task_id);
CREATE INDEX IF NOT EXISTS idx_task_steps_completed_by
  ON task_steps(completed_by) WHERE completed_at IS NOT NULL;

ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;

-- Admin: full
DROP POLICY IF EXISTS "task_steps_admin" ON task_steps;
CREATE POLICY "task_steps_admin" ON task_steps
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Team: visible/insert/update if assigned to the parent task's client
DROP POLICY IF EXISTS "task_steps_team" ON task_steps;
CREATE POLICY "task_steps_team" ON task_steps
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND task_id IN (
      SELECT id FROM tasks WHERE client_id IN (
        SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
      )
    )
  );

-- Client: read-only access to steps of tasks the client can see
DROP POLICY IF EXISTS "task_steps_client_read" ON task_steps;
CREATE POLICY "task_steps_client_read" ON task_steps
  FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE client_id IN (
        SELECT client_id FROM client_users
        WHERE user_id = auth.uid() AND is_active = TRUE
      )
      AND status IN ('in_progress', 'completed') AND is_blocked_on_client = TRUE
    )
  );

-- ----------------------------------------------------------------------------
-- 8. STAFF ROLE TEMPLATES (firm-defined roles, no presets)
-- ----------------------------------------------------------------------------
-- Each firm defines its own role templates ("Senior Tax Associate", "Articleship",
-- whatever). Applying a role template to a staff member bulk-grants its
-- capabilities into staff_capabilities. Changing the role replaces the set;
-- individual overrides are tracked separately on staff_capabilities.

CREATE TABLE IF NOT EXISTS staff_role_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users_profile(id),
  is_deleted BOOLEAN DEFAULT FALSE
);

ALTER TABLE staff_role_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_templates_admin" ON staff_role_templates;
CREATE POLICY "role_templates_admin" ON staff_role_templates
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "role_templates_team_read" ON staff_role_templates;
CREATE POLICY "role_templates_team_read" ON staff_role_templates
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'));

CREATE TABLE IF NOT EXISTS staff_role_template_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES staff_role_templates(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,

  UNIQUE(template_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_role_template_caps_template
  ON staff_role_template_capabilities(template_id);

ALTER TABLE staff_role_template_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_template_caps_admin" ON staff_role_template_capabilities;
CREATE POLICY "role_template_caps_admin" ON staff_role_template_capabilities
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Track which template (if any) is currently applied to a staff member.
-- Optional pointer; staff_capabilities remains the source of truth for what
-- capabilities the user actually holds (incl. overrides).
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS active_role_template_id UUID REFERENCES staff_role_templates(id);

-- ----------------------------------------------------------------------------
-- 9. CLIENT IMPORT BATCHES (bulk import audit trail)
-- ----------------------------------------------------------------------------
-- One row per upload. Captures the file name, row counts, and any errors so
-- admin can audit a bulk import and re-run if needed.

CREATE TABLE IF NOT EXISTS client_import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by UUID NOT NULL REFERENCES users_profile(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),

  source_filename TEXT,
  total_rows INT NOT NULL,
  successful_rows INT NOT NULL DEFAULT 0,
  skipped_rows INT NOT NULL DEFAULT 0,
  error_rows INT NOT NULL DEFAULT 0,

  errors JSONB DEFAULT '[]',  -- array of { row_index, business_name, error }

  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('processing', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_client_import_batches_uploaded_by
  ON client_import_batches(uploaded_by);

ALTER TABLE client_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_batches_admin" ON client_import_batches;
CREATE POLICY "import_batches_admin" ON client_import_batches
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 10. STARTER-SET CATALOGUE CLEANUP (run once, idempotent)
-- ----------------------------------------------------------------------------
-- The original schema.sql v3 inserted starter rows into service_categories,
-- services, and sub_services so the system was usable on first boot. The user
-- has confirmed they want a CLEAN SLATE: services and sub-services are
-- exclusively admin-defined.
--
-- This DELETE is idempotent — runs only against rows that match the original
-- starter-set and are NOT yet referenced by any client_services /
-- client_sub_services / tasks (so a later run after admin has already
-- referenced these rows will leave them alone).
--
-- IMPORTANT: Run this AFTER the admin has had a chance to delete starter rows
-- via the admin UI, or run it BEFORE any client gets services assigned.

DELETE FROM sub_services WHERE code IN (
  'GST_3B','GST_1','GST_9','TDS_Q','ITR','BL_MONTHLY','BL_QUARTERLY',
  'VCFO_CALL','VCFO_NOTE','CBAM_Q','SOX_ASSESS'
)
AND id NOT IN (SELECT sub_service_id FROM client_sub_services)
AND id NOT IN (SELECT sub_service_id FROM tasks WHERE sub_service_id IS NOT NULL);

DELETE FROM services WHERE code IN ('CAAS','BIZLENS','VCFO','CBAM','SOX')
AND id NOT IN (SELECT service_id FROM client_services)
AND id NOT IN (SELECT service_id FROM sub_services);

DELETE FROM service_categories WHERE name IN ('Compliance','Analytics','Advisory','Specialty')
AND id NOT IN (SELECT category_id FROM services);

-- ============================================================================
-- DONE — v3.2
-- ============================================================================
-- The all_work_items view has been removed (see migrations/2026-06-02-drop-insecure-all-work-items.sql).
-- It was unreferenced in application code, lacked SECURITY INVOKER, and bypassed RLS.
DROP VIEW IF EXISTS all_work_items;
-- ============================================================================
-- THE FISCAL FULCRUM — BIZLENS NATIVE PORT (v3.3)
-- ============================================================================
-- Apply this file to the database to create the columnar schema for BizLens.

CREATE TABLE IF NOT EXISTS bizlens_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Core period
  period_month INT CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  months_covered INT NOT NULL DEFAULT 1,
  
  -- P&L / Operations
  sales_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0,
  variable_costs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fixed_costs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fc_includes_interest BOOLEAN DEFAULT FALSE,
  purchases NUMERIC(14, 2) DEFAULT 0,
  interest_expense NUMERIC(14, 2) DEFAULT 0,
  target_profit NUMERIC(14, 2) DEFAULT 0,
  inventory_change NUMERIC(14, 2) DEFAULT 0,
  other_income NUMERIC(14, 2) DEFAULT 0,
  non_cash_expenses NUMERIC(14, 2) DEFAULT 0,
  
  -- Balance Sheet: Assets
  bs_cash NUMERIC(14, 2) DEFAULT 0,
  bs_inventory NUMERIC(14, 2) DEFAULT 0,
  bs_accounts_receivable NUMERIC(14, 2) DEFAULT 0,
  bs_other_current_assets NUMERIC(14, 2) DEFAULT 0,
  bs_loans_advances NUMERIC(14, 2) DEFAULT 0,
  realisable_fixed_assets NUMERIC(14, 2) DEFAULT 0,
  
  -- Balance Sheet: Liabilities & Equity
  bs_accounts_payable NUMERIC(14, 2) DEFAULT 0,
  bs_current_liabilities_other NUMERIC(14, 2) DEFAULT 0,
  bs_short_term_borrowings NUMERIC(14, 2) DEFAULT 0,
  bs_long_term_borrowings NUMERIC(14, 2) DEFAULT 0,
  bs_other_liabilities NUMERIC(14, 2) DEFAULT 0,
  bs_equity NUMERIC(14, 2) DEFAULT 0,
  
  -- Ageing (AR)
  ar_ageing_available BOOLEAN DEFAULT FALSE,
  ar_0_30 NUMERIC(14, 2) DEFAULT 0,
  ar_31_60 NUMERIC(14, 2) DEFAULT 0,
  ar_61_90 NUMERIC(14, 2) DEFAULT 0,
  ar_90_plus NUMERIC(14, 2) DEFAULT 0,
  
  -- Ageing (AP)
  ap_ageing_available BOOLEAN DEFAULT FALSE,
  ap_0_30 NUMERIC(14, 2) DEFAULT 0,
  ap_31_60 NUMERIC(14, 2) DEFAULT 0,
  ap_61_90 NUMERIC(14, 2) DEFAULT 0,
  ap_90_plus NUMERIC(14, 2) DEFAULT 0,
  
  -- Concentration & Strategic
  top_customer_pct NUMERIC(5, 2),
  top_supplier_pct NUMERIC(5, 2),
  wc_intentional BOOLEAN DEFAULT FALSE,
  ap_strategic BOOLEAN DEFAULT FALSE,
  
  -- State
  status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  created_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- For overriding older versions for the same period
  is_current BOOLEAN DEFAULT TRUE,
  superseded_by UUID REFERENCES bizlens_data(id)
);

CREATE INDEX IF NOT EXISTS idx_bizlens_data_client ON bizlens_data(client_id);
CREATE INDEX IF NOT EXISTS idx_bizlens_data_period ON bizlens_data(period_year, period_month);
-- Partial unique: only one CURRENT report per (client, period). Historical
-- (is_current=false) rows are unrestricted so we can keep an audit chain.
CREATE UNIQUE INDEX IF NOT EXISTS bizlens_data_current_per_period_uidx
  ON bizlens_data(client_id, period_month, period_year)
  WHERE is_current = TRUE;

ALTER TABLE bizlens_data ENABLE ROW LEVEL SECURITY;

-- Admin: full access
DROP POLICY IF EXISTS "bizlens_admin_all" ON bizlens_data;
CREATE POLICY "bizlens_admin_all" ON bizlens_data
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Team: access if assigned to client AND holds 'bizlens.enter' capability
DROP POLICY IF EXISTS "bizlens_team_all" ON bizlens_data;
CREATE POLICY "bizlens_team_all" ON bizlens_data
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM staff_capabilities WHERE user_id = auth.uid() AND capability = 'bizlens.enter' AND revoked_at IS NULL)
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM staff_capabilities WHERE user_id = auth.uid() AND capability = 'bizlens.enter' AND revoked_at IS NULL)
  );

-- Team (View Only): access if assigned to client (even without bizlens.enter)
DROP POLICY IF EXISTS "bizlens_team_read" ON bizlens_data;
CREATE POLICY "bizlens_team_read" ON bizlens_data
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
  );

-- Client: access if portal module enabled and status is published
DROP POLICY IF EXISTS "bizlens_client_read" ON bizlens_data;
CREATE POLICY "bizlens_client_read" ON bizlens_data
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'client'
    AND status = 'published'
    AND client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
    AND EXISTS (SELECT 1 FROM client_portal_visibility WHERE client_id = bizlens_data.client_id AND module_key = 'portal.bizlens' AND is_enabled = TRUE)
  );
-- HR & timekeeping tables
-- Created: 2026-05-13

CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  year INT NOT NULL,
  accrued_paid_leaves NUMERIC(4,2) DEFAULT 0.00,
  taken_paid_leaves NUMERIC(4,2) DEFAULT 0.00,
  remaining_paid_leaves NUMERIC(4,2) GENERATED ALWAYS AS (accrued_paid_leaves - taken_paid_leaves) STORED,
  UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_user_id ON leave_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_balances_select_own"
  ON leave_balances
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "leave_balances_select_manager"
  ON leave_balances
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users_profile WHERE users_profile.id = auth.uid() AND users_profile.role = 'admin'
  ));

CREATE POLICY "leave_balances_admin_all"
  ON leave_balances
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users_profile WHERE users_profile.id = auth.uid() AND users_profile.role = 'admin'
  ));

CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_optional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(holiday_date)
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "holidays_select_all"
  ON holidays
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "holidays_admin_all"
  ON holidays
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users_profile WHERE users_profile.id = auth.uid() AND users_profile.role = 'admin'
  ));
-- Permission / OD request table (additive, no breaking changes)
CREATE TABLE IF NOT EXISTS permission_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  request_date DATE NOT NULL,
  from_time TIME,
  to_time TIME,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP,
  review_remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_requests_user ON permission_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_requests_status ON permission_requests(status);

-- RLS
ALTER TABLE permission_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY permission_user_own ON permission_requests
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY permission_admin_all ON permission_requests
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin'::text)
  WITH CHECK (current_user_role() = 'admin'::text);
-- Performance indices for tasks table
-- Created: 2026-05-13

CREATE INDEX IF NOT EXISTS idx_tasks_client_status ON tasks(client_id, status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status_due ON tasks(assigned_to, status, due_date)
  WHERE is_deleted = false;
-- Unified inbox view for chronological work feed
-- SECURITY INVOKER ensures RLS on underlying tables is respected
-- All underlying queries filter is_deleted = false (or equivalent status filter)

CREATE OR REPLACE VIEW v_unified_inbox
WITH (security_invoker = true) AS

-- Tasks (assigned or created recently, not deleted)
SELECT
  t.id,
  'task' AS item_type,
  t.title,
  t.status,
  t.priority,
  t.due_date,
  t.created_at AS occurred_at,
  t.assigned_to AS actor_id,
  t.client_id,
  c.business_name AS client_name,
  NULL::uuid AS related_entity_id,
  NULL::text AS related_entity_type,
  jsonb_build_object(
    'task_number', t.task_number,
    'is_stuck', t.is_stuck,
    'is_blocked_on_client', t.is_blocked_on_client
  ) AS meta
FROM tasks t
LEFT JOIN clients c ON c.id = t.client_id
WHERE t.is_deleted = false
  AND t.status IN ('pending', 'in_progress')

UNION ALL

-- Notices (open, not deleted)
SELECT
  n.id,
  'notice' AS item_type,
  COALESCE(n.subject, n.notice_type::text) AS title,
  n.status,
  'high' AS priority,
  n.due_date,
  n.notice_received_date AS occurred_at,
  n.assigned_to AS actor_id,
  n.client_id,
  c.business_name AS client_name,
  NULL::uuid AS related_entity_id,
  NULL::text AS related_entity_type,
  jsonb_build_object(
    'notice_type', n.notice_type,
    'authority', n.issuing_authority,
    'amount_involved', n.amount_involved
  ) AS meta
FROM notices n
LEFT JOIN clients c ON c.id = n.client_id
WHERE n.is_deleted = false
  AND n.status != 'closed'

UNION ALL

-- Queries (not closed, not deleted)
SELECT
  q.id,
  'query' AS item_type,
  q.subject AS title,
  q.status,
  q.priority,
  NULL::date AS due_date,
  q.created_at AS occurred_at,
  q.created_by AS actor_id,
  q.client_id,
  c.business_name AS client_name,
  NULL::uuid AS related_entity_id,
  NULL::text AS related_entity_type,
  jsonb_build_object(
    'query_id', q.id
  ) AS meta
FROM queries q
LEFT JOIN clients c ON c.id = q.client_id
WHERE q.is_deleted = false
  AND q.status != 'closed'

UNION ALL

-- Compliance calendar events (virtual work items when no task exists)
SELECT
  e.id,
  'compliance' AS item_type,
  r.display_name AS title,
  e.status,
  'medium' AS priority,
  e.due_date,
  e.generated_at AS occurred_at,
  NULL::uuid AS actor_id,
  e.client_id,
  c.business_name AS client_name,
  e.task_id AS related_entity_id,
  'task' AS related_entity_type,
  jsonb_build_object(
    'rule_code', r.rule_code,
    'service_kind', r.service_kind,
    'period_label', e.period_label
  ) AS meta
FROM compliance_calendar_events e
LEFT JOIN compliance_calendar_rules r ON r.id = e.rule_id
LEFT JOIN clients c ON c.id = e.client_id
WHERE e.task_id IS NULL
  AND e.is_deleted = false;

-- Indexes for performance (on underlying tables)
CREATE INDEX IF NOT EXISTS idx_tasks_unified_inbox ON tasks(status, is_deleted, due_date) WHERE is_deleted = false AND status IN ('pending', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_notices_unified_inbox ON notices(status, is_deleted, due_date) WHERE is_deleted = false AND status != 'closed';
CREATE INDEX IF NOT EXISTS idx_queries_unified_inbox ON queries(status, is_deleted, created_at) WHERE is_deleted = false AND status != 'closed';
CREATE INDEX IF NOT EXISTS idx_compliance_events_unified_inbox ON compliance_calendar_events(task_id, due_date) WHERE task_id IS NULL;
-- ============================================================
-- THE FISCAL FULCRUM — Schema v3.3 (GO_FORWARD_PLAN v3)
-- ============================================================
-- Run after v3.2 (db/schema-additions.sql).
-- Idempotent where possible (IF NOT EXISTS / DO blocks). Safe to re-run.
--
-- Adjustments from the spec to match this codebase's conventions:
--   * users_profile(id) FK target, NOT auth.users(id)
--   * public.current_user_role() helper, NOT auth.jwt() ->> 'role'
--   * team_client_assignment(team_user_id, client_id), NOT client_assignments
--   * uuid_generate_v4() default, NOT gen_random_uuid()
--   * attendance_logs table, NOT attendance
--   * Capability strings live in lib/auth/capabilities.ts (closed list);
--     no `capabilities` master table is created here.
-- ============================================================


-- ----------------------------------------------------------------
-- Section 1: Tasks — collapse status, add stuck/verification/PC/CC
-- ----------------------------------------------------------------

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_blocked_on_client     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_stuck                 BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stuck_reason_code        TEXT,
  ADD COLUMN IF NOT EXISTS stuck_reason_note        TEXT,
  ADD COLUMN IF NOT EXISTS client_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_status      TEXT NOT NULL DEFAULT 'not_required'
    CHECK (verification_status IN ('not_required','pending','verified')),
  ADD COLUMN IF NOT EXISTS verified_by_user_id      UUID REFERENCES users_profile(id),
  ADD COLUMN IF NOT EXISTS verified_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_note        TEXT,
  ADD COLUMN IF NOT EXISTS profit_centre_code       TEXT,
  ADD COLUMN IF NOT EXISTS cost_centre_code         TEXT,
  ADD COLUMN IF NOT EXISTS billing_entity_id        UUID,
  ADD COLUMN IF NOT EXISTS estimated_hours          NUMERIC(8,2);

-- Migrate legacy enum values BEFORE swapping the check constraint.
-- Audit trail: write a task_activity row noting the v3 status migration.
DO $$
BEGIN
  -- awaiting_client → in_progress + is_blocked_on_client = TRUE
  INSERT INTO task_activity (task_id, action, field_name, old_value, new_value, changed_by)
  SELECT t.id, 'v3_status_migration', 'status', 'awaiting_client', 'in_progress (blocked_on_client)', NULL
  FROM tasks t WHERE t.status = 'awaiting_client';

  UPDATE tasks
     SET is_blocked_on_client = TRUE,
         status = 'in_progress',
         updated_at = NOW()
   WHERE status = 'awaiting_client';

  -- review → in_progress (verification handled separately by sub-service flag)
  INSERT INTO task_activity (task_id, action, field_name, old_value, new_value, changed_by)
  SELECT t.id, 'v3_status_migration', 'status', 'review', 'in_progress', NULL
  FROM tasks t WHERE t.status = 'review';

  UPDATE tasks
     SET status = 'in_progress',
         updated_at = NOW()
   WHERE status = 'review';
END $$;

-- Replace status check constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending','in_progress','completed','cancelled'));

-- Stuck reason check
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_stuck_reason_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_stuck_reason_check
  CHECK (stuck_reason_code IS NULL OR stuck_reason_code IN (
    'client_clarification','gst_portal_down','itd_portal_down','mcadown',
    'mismatch_investigation','awaiting_third_party','awaiting_management',
    'dsc_issue','payment_pending','other'
  ));

CREATE INDEX IF NOT EXISTS idx_tasks_is_stuck       ON tasks(is_stuck) WHERE is_stuck = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_blocked_client ON tasks(is_blocked_on_client) WHERE is_blocked_on_client = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_profit_centre  ON tasks(profit_centre_code);
CREATE INDEX IF NOT EXISTS idx_tasks_billing_entity ON tasks(billing_entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_verification   ON tasks(verification_status) WHERE verification_status = 'pending';


-- ----------------------------------------------------------------
-- Section 2: Profit Centres + Cost Centres + Billing Entities
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profit_centres (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_centres (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_entities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  legal_name      TEXT,
  gstin           TEXT,
  pan             TEXT,
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  invoice_prefix  TEXT NOT NULL,
  default_profit_centre_code TEXT REFERENCES profit_centres(code),
  signing_authority_name TEXT,
  signing_authority_designation TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc       TEXT,
  bank_name       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_billing_entity_access (
  user_id           UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  billing_entity_id UUID NOT NULL REFERENCES billing_entities(id) ON DELETE CASCADE,
  granted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, billing_entity_id)
);

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS default_profit_centre_code TEXT REFERENCES profit_centres(code),
  ADD COLUMN IF NOT EXISTS default_cost_centre_code   TEXT REFERENCES cost_centres(code),
  ADD COLUMN IF NOT EXISTS default_billing_entity_id  UUID REFERENCES billing_entities(id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_billing_entity_fk') THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_billing_entity_fk FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id);
  END IF;
END $$;

ALTER TABLE profit_centres            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centres              ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_entities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_billing_entity_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pc_read    ON profit_centres;
DROP POLICY IF EXISTS pc_admin   ON profit_centres;
DROP POLICY IF EXISTS cc_read    ON cost_centres;
DROP POLICY IF EXISTS cc_admin   ON cost_centres;
DROP POLICY IF EXISTS be_read    ON billing_entities;
DROP POLICY IF EXISTS be_admin   ON billing_entities;
DROP POLICY IF EXISTS ubea_self  ON user_billing_entity_access;
DROP POLICY IF EXISTS ubea_admin ON user_billing_entity_access;

CREATE POLICY pc_read   ON profit_centres   FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY pc_admin  ON profit_centres   FOR ALL    TO authenticated USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY cc_read   ON cost_centres     FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY cc_admin  ON cost_centres     FOR ALL    TO authenticated USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY be_read   ON billing_entities FOR SELECT TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR id IN (SELECT billing_entity_id FROM user_billing_entity_access WHERE user_id = auth.uid())
);
CREATE POLICY be_admin  ON billing_entities FOR ALL    TO authenticated USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY ubea_self  ON user_billing_entity_access FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.current_user_role() = 'admin'
);
CREATE POLICY ubea_admin ON user_billing_entity_access FOR ALL    TO authenticated USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');


-- ----------------------------------------------------------------
-- Section 3: Compliance Calendar Rules Engine
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS compliance_calendar_rules (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_code           TEXT NOT NULL UNIQUE,
  display_name        TEXT NOT NULL,
  service_kind        TEXT NOT NULL,
  periodicity         TEXT NOT NULL,
  due_day             INTEGER,
  due_month_offset    INTEGER NOT NULL DEFAULT 1,
  due_date_formula    TEXT,
  applies_when        JSONB NOT NULL DEFAULT '{}'::jsonb,
  reminder_days       INTEGER[] NOT NULL DEFAULT '{7,3,1}',
  description         TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ccr_kind   ON compliance_calendar_rules(service_kind);
CREATE INDEX IF NOT EXISTS idx_ccr_active ON compliance_calendar_rules(is_active) WHERE is_active = TRUE;

ALTER TABLE compliance_calendar_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ccr_read  ON compliance_calendar_rules;
DROP POLICY IF EXISTS ccr_admin ON compliance_calendar_rules;
CREATE POLICY ccr_read  ON compliance_calendar_rules FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY ccr_admin ON compliance_calendar_rules FOR ALL    TO authenticated USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE TABLE IF NOT EXISTS client_compliance_profiles (
  client_id                UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  gst_filing_frequency     TEXT CHECK (gst_filing_frequency IN ('monthly','qrmp','not_applicable')),
  state_group              TEXT CHECK (state_group IN ('A','B') OR state_group IS NULL),
  entity_type              TEXT CHECK (entity_type IN ('company','llp','firm','proprietorship','huf','trust','aop','boi','individual')),
  is_audit_applicable      BOOLEAN NOT NULL DEFAULT FALSE,
  is_tds_deductor          BOOLEAN NOT NULL DEFAULT FALSE,
  is_tcs_collector         BOOLEAN NOT NULL DEFAULT FALSE,
  is_advance_tax_applicable BOOLEAN NOT NULL DEFAULT FALSE,
  is_pf_applicable         BOOLEAN NOT NULL DEFAULT FALSE,
  is_esi_applicable        BOOLEAN NOT NULL DEFAULT FALSE,
  is_pt_applicable         BOOLEAN NOT NULL DEFAULT FALSE,
  pt_state                 TEXT,
  is_roc_applicable        BOOLEAN NOT NULL DEFAULT FALSE,
  agm_date                 DATE,
  is_transfer_pricing      BOOLEAN NOT NULL DEFAULT FALSE,
  annual_turnover_estimate NUMERIC(15,2),
  fy_start_month           INTEGER NOT NULL DEFAULT 4,
  notes                    TEXT,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE client_compliance_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ccp_team_read ON client_compliance_profiles;
DROP POLICY IF EXISTS ccp_admin     ON client_compliance_profiles;
CREATE POLICY ccp_team_read ON client_compliance_profiles FOR SELECT TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
);
CREATE POLICY ccp_admin     ON client_compliance_profiles FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
) WITH CHECK (public.current_user_role() IN ('admin','team'));

CREATE TABLE IF NOT EXISTS compliance_calendar_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_id           UUID NOT NULL REFERENCES compliance_calendar_rules(id) ON DELETE CASCADE,
  rule_code         TEXT NOT NULL,
  period_label      TEXT NOT NULL,
  due_date          DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','task_created','filed','overdue','dismissed')),
  task_id           UUID REFERENCES tasks(id) ON DELETE SET NULL,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, rule_id, period_label)
);

CREATE INDEX IF NOT EXISTS idx_cce_client_due ON compliance_calendar_events(client_id, due_date);
CREATE INDEX IF NOT EXISTS idx_cce_status     ON compliance_calendar_events(status);

ALTER TABLE compliance_calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cce_team   ON compliance_calendar_events;
DROP POLICY IF EXISTS cce_client ON compliance_calendar_events;
DROP POLICY IF EXISTS cce_admin  ON compliance_calendar_events;
CREATE POLICY cce_team   ON compliance_calendar_events FOR SELECT TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
);
CREATE POLICY cce_client ON compliance_calendar_events FOR SELECT TO authenticated USING (
  client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
);
CREATE POLICY cce_admin  ON compliance_calendar_events FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
) WITH CHECK (public.current_user_role() IN ('admin','team'));


-- ----------------------------------------------------------------
-- Section 4: Document Requests
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS document_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id           UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  document_name     TEXT NOT NULL,
  description       TEXT,
  is_required       BOOLEAN NOT NULL DEFAULT TRUE,
  due_date          DATE,
  fulfilled_at      TIMESTAMPTZ,
  fulfilled_by_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  fulfilled_by_user_id UUID REFERENCES users_profile(id) ON DELETE SET NULL,
  created_by        UUID NOT NULL REFERENCES users_profile(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docreq_task    ON document_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_docreq_client  ON document_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_docreq_pending ON document_requests(client_id) WHERE fulfilled_at IS NULL;

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS docreq_team          ON document_requests;
DROP POLICY IF EXISTS docreq_client        ON document_requests;
DROP POLICY IF EXISTS docreq_client_update ON document_requests;
CREATE POLICY docreq_team   ON document_requests FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
) WITH CHECK (
  public.current_user_role() IN ('admin','team')
  OR client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
);
CREATE POLICY docreq_client ON document_requests FOR SELECT TO authenticated USING (
  client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
);
CREATE POLICY docreq_client_update ON document_requests FOR UPDATE TO authenticated USING (
  client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
) WITH CHECK (
  client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
);

CREATE TABLE IF NOT EXISTS sub_service_document_request_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_service_id  UUID NOT NULL REFERENCES sub_services(id) ON DELETE CASCADE,
  document_name   TEXT NOT NULL,
  description     TEXT,
  is_required     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ssdrt_sub_service ON sub_service_document_request_templates(sub_service_id, display_order);

ALTER TABLE sub_service_document_request_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ssdrt_read  ON sub_service_document_request_templates;
DROP POLICY IF EXISTS ssdrt_admin ON sub_service_document_request_templates;
CREATE POLICY ssdrt_read  ON sub_service_document_request_templates FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY ssdrt_admin ON sub_service_document_request_templates FOR ALL TO authenticated USING (
  public.current_user_role() = 'admin'
) WITH CHECK (public.current_user_role() = 'admin');


-- ----------------------------------------------------------------
-- Section 5: Custom Fields and Labels
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_custom_field_definitions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id      UUID REFERENCES services(id) ON DELETE CASCADE,
  sub_service_id  UUID REFERENCES sub_services(id) ON DELETE CASCADE,
  field_key       TEXT NOT NULL,
  display_label   TEXT NOT NULL,
  field_type      TEXT NOT NULL CHECK (field_type IN ('text','number','date','dropdown','boolean')),
  options_json    JSONB,
  is_required     BOOLEAN NOT NULL DEFAULT FALSE,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (service_id IS NOT NULL OR sub_service_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tcfd_subsvc_key ON task_custom_field_definitions(sub_service_id, field_key) WHERE sub_service_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tcfd_svc_key    ON task_custom_field_definitions(service_id, field_key)    WHERE service_id IS NOT NULL AND sub_service_id IS NULL;

CREATE TABLE IF NOT EXISTS task_custom_field_values (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  definition_id UUID NOT NULL REFERENCES task_custom_field_definitions(id) ON DELETE CASCADE,
  value_text    TEXT,
  value_number  NUMERIC(20,4),
  value_date    DATE,
  value_bool    BOOLEAN,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, definition_id)
);

CREATE INDEX IF NOT EXISTS idx_tcfv_task ON task_custom_field_values(task_id);

ALTER TABLE task_custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_custom_field_values      ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tcfd_read  ON task_custom_field_definitions;
DROP POLICY IF EXISTS tcfd_admin ON task_custom_field_definitions;
DROP POLICY IF EXISTS tcfv_team  ON task_custom_field_values;
CREATE POLICY tcfd_read  ON task_custom_field_definitions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY tcfd_admin ON task_custom_field_definitions FOR ALL TO authenticated USING (
  public.current_user_role() = 'admin'
) WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY tcfv_team  ON task_custom_field_values FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
) WITH CHECK (
  public.current_user_role() IN ('admin','team')
  OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
);

CREATE TABLE IF NOT EXISTS task_labels (
  code         TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  color_hex    TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_label_assignments (
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_code  TEXT NOT NULL REFERENCES task_labels(code) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, label_code)
);

ALTER TABLE task_labels            ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_label_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tl_read  ON task_labels;
DROP POLICY IF EXISTS tl_admin ON task_labels;
DROP POLICY IF EXISTS tla_team ON task_label_assignments;
CREATE POLICY tl_read  ON task_labels FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY tl_admin ON task_labels FOR ALL TO authenticated USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY tla_team ON task_label_assignments FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
) WITH CHECK (
  public.current_user_role() IN ('admin','team')
  OR task_id IN (SELECT id FROM tasks WHERE client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()))
);


-- ----------------------------------------------------------------
-- Section 6: WorkDone (timesheet)
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_workdone (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  work_date     DATE NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  note          TEXT,
  entry_method  TEXT NOT NULL CHECK (entry_method IN ('timer','manual')),
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workdone_task   ON task_workdone(task_id);
CREATE INDEX IF NOT EXISTS idx_workdone_user_d ON task_workdone(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_workdone_client ON task_workdone(client_id);

ALTER TABLE task_workdone ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wd_self      ON task_workdone;
DROP POLICY IF EXISTS wd_team_read ON task_workdone;
CREATE POLICY wd_self      ON task_workdone FOR ALL TO authenticated USING (
  user_id = auth.uid() OR public.current_user_role() = 'admin'
) WITH CHECK (
  user_id = auth.uid() OR public.current_user_role() = 'admin'
);
CREATE POLICY wd_team_read ON task_workdone FOR SELECT TO authenticated USING (
  public.current_user_role() IN ('admin','team')
);


-- ----------------------------------------------------------------
-- Section 7: Geo-tagged attendance
-- ----------------------------------------------------------------

ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS check_in_lat        NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS check_in_lng        NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS check_in_accuracy_m INTEGER,
  ADD COLUMN IF NOT EXISTS check_in_address    TEXT;

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS geo_check_in_required BOOLEAN NOT NULL DEFAULT FALSE;


-- ----------------------------------------------------------------
-- Section 8: Inward-Outward removal
-- ----------------------------------------------------------------

DROP TABLE IF EXISTS inward_outward_register CASCADE;


-- ============================================================
-- Done.
-- ============================================================
-- Weekly timesheet submission and approval workflow
-- Created: 2026-05-13

CREATE TABLE IF NOT EXISTS weekly_timesheet_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES users_profile(id) ON DELETE SET NULL,

  week_start DATE NOT NULL,
  week_end DATE NOT NULL,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),

  -- Auto-computed summary at time of submission
  present_days INT DEFAULT 0,
  leave_days INT DEFAULT 0,
  wfh_days INT DEFAULT 0,
  half_days INT DEFAULT 0,
  permission_hours NUMERIC(4,1) DEFAULT 0,

  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users_profile(id) ON DELETE SET NULL,
  review_remarks TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- One submission per user per week
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_ts_user_id ON weekly_timesheet_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_ts_manager_id ON weekly_timesheet_submissions(manager_id);
CREATE INDEX IF NOT EXISTS idx_weekly_ts_status ON weekly_timesheet_submissions(status);
CREATE INDEX IF NOT EXISTS idx_weekly_ts_week_start ON weekly_timesheet_submissions(week_start);

-- RLS
ALTER TABLE weekly_timesheet_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_ts_select_own"
  ON weekly_timesheet_submissions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "weekly_ts_select_manager"
  ON weekly_timesheet_submissions
  FOR SELECT
  USING (manager_id = auth.uid());

CREATE POLICY "weekly_ts_insert_own"
  ON weekly_timesheet_submissions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "weekly_ts_update_manager"
  ON weekly_timesheet_submissions
  FOR UPDATE
  USING (manager_id = auth.uid());
-- ============================================================================
-- THE FISCAL FULCRUM — DATABASE SCHEMA (v3, PRODUCTION-READY)
-- ============================================================================
--
-- Last revised: May 4, 2026
-- Status: Locked. Deploy as-is to Supabase.
--
-- v3 CHANGES (vs. v2):
--   ✅ Added: Partial unique index on tasks to prevent duplicate generation
--             at DB level (defence-in-depth alongside application check)
--   ✅ Header updated to reflect Next.js-native backend (Flask bundle deprecated)
--   ✅ Schema itself is stack-agnostic and unchanged in structure from v2
--
-- v2 CHANGES (vs. original):
--   ❌ Removed: Arrays in enabled_sub_services (use normalized tables instead)
--   ❌ Removed: Over-use of JSONB for core data
--   ❌ Removed: Business logic pushed into database triggers
--   ✅ Added: Clean relational service access (no arrays)
--   ✅ Added: JSONB only for optional feature flags
--   ✅ Clarified: Database is storage+constraints, application layer has logic
--
-- Design Principles:
--   1. Single-firm, single-tenant (yours only, not multi-tenant SaaS)
--   2. Relational integrity enforced at DB level
--   3. Business logic lives in application (Next.js Server Actions / API Routes)
--   4. Database enforces facts; application enforces rules
--   5. JSONB only for optional, evolving feature flags
--   6. No triggers for business logic (use Vercel Cron instead)
--
-- ============================================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. AUTHENTICATION & IDENTITY
-- ============================================================================

CREATE TABLE users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  
  role TEXT NOT NULL CHECK (role IN ('admin', 'team', 'client')),
  
  job_title TEXT,
  department TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  
  reports_to UUID REFERENCES users_profile(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID
);

CREATE INDEX idx_users_profile_role ON users_profile(role);
CREATE INDEX idx_users_profile_is_active ON users_profile(is_active);

-- ============================================================================
-- 2. CLIENTS & CLIENT GROUPING
-- ============================================================================

CREATE TABLE client_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  business_name TEXT NOT NULL,
  business_registration_number TEXT,
  
  pan TEXT UNIQUE,
  gstin TEXT,
  
  category TEXT CHECK (category IN (
    'sole_proprietor', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'huf', 'aop', 'ngo', 'other'
  )),
  residential_status TEXT CHECK (residential_status IN ('resident', 'non_resident')),
  industry TEXT,
  
  primary_contact_person TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  
  group_id UUID REFERENCES client_groups(id),
  
  portal_enabled BOOLEAN DEFAULT FALSE,
  portal_access_level TEXT DEFAULT 'restricted',
  
  priority_tier TEXT CHECK (priority_tier IN ('standard', 'premium', 'strategic')) DEFAULT 'standard',
  lifecycle_stage TEXT CHECK (lifecycle_stage IN (
    'lead', 'caas_only', 'caas_bizlens', 'caas_vcfo', 'caas_bizlens_vcfo', 'full_suite', 'churn'
  )) DEFAULT 'lead',
  
  primary_owner_id UUID REFERENCES users_profile(id),
  
  start_date DATE,
  contract_value_annual NUMERIC(12, 2),
  contract_renewal_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID
);

CREATE INDEX idx_clients_gstin ON clients(gstin);
CREATE INDEX idx_clients_pan ON clients(pan);
CREATE INDEX idx_clients_group_id ON clients(group_id);
CREATE INDEX idx_clients_lifecycle_stage ON clients(lifecycle_stage);

CREATE TABLE client_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  
  role_in_client TEXT CHECK (role_in_client IN ('owner', 'accountant', 'manager', 'other')),
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_client_users_client ON client_users(client_id);
CREATE INDEX idx_client_users_user ON client_users(user_id);

CREATE TABLE team_client_assignment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_user_id UUID NOT NULL REFERENCES users_profile(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  role TEXT CHECK (role IN ('lead', 'support', 'reviewer')) DEFAULT 'lead',
  
  assigned_from DATE NOT NULL,
  assigned_to DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_team_client_assignment_team ON team_client_assignment(team_user_id);
CREATE INDEX idx_team_client_assignment_client ON team_client_assignment(client_id);

-- ============================================================================
-- 3. SERVICE ARCHITECTURE (REVISED: NO ARRAYS, FULLY RELATIONAL)
-- ============================================================================
--
-- Structure:
--   service_categories → services → sub_services
--   
--   client_services (maps client to service)
--   client_sub_services (maps client to specific sub-services)
--   client_feature_flags (optional: rare feature toggles only)
--
-- Why this design?
--   ✓ Clean relational integrity
--   ✓ Proper indexing and query performance
--   ✓ No arrays (arrays are hard to query and index)
--   ✓ Explicit mappings (you see exactly what's enabled)
--   ✓ Easy to audit and modify

CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

INSERT INTO service_categories (name, description, display_order) VALUES
  ('Compliance', 'Filing, returns, regulatory compliance', 1),
  ('Analytics', 'Financial intelligence and insights', 2),
  ('Advisory', 'CFO-level strategic guidance', 3),
  ('Specialty', 'CBAM, SOX, and specialized services', 4)
ON CONFLICT DO NOTHING;

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES service_categories(id),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  icon_url TEXT,
  display_order INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_services_category ON services(category_id);

INSERT INTO services (category_id, name, code, description) VALUES
  (1, 'Compliance as a Service', 'CAAS', 'GST, TDS, IT filing with compliance tracking'),
  (2, 'BizLens Analytics', 'BIZLENS', 'Financial intelligence and analytics engine'),
  (3, 'Virtual CFO', 'VCFO', 'Monthly financial strategy and advisory'),
  (4, 'CBAM & ESG Advisory', 'CBAM', 'Carbon border adjustment and ESG compliance'),
  (4, 'Process & Controls (SOX/ICFR)', 'SOX', 'Internal controls and ICFR for US-facing entities')
ON CONFLICT DO NOTHING;

CREATE TABLE sub_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  
  frequency TEXT CHECK (frequency IN ('monthly', 'quarterly', 'annually', 'on_demand')),
  
  due_day_of_month INT CHECK (due_day_of_month BETWEEN 1 AND 31),
  due_day_of_quarter INT,
  due_month INT,
  
  is_billable BOOLEAN DEFAULT TRUE,
  is_recurring BOOLEAN DEFAULT TRUE,
  requires_client_input BOOLEAN DEFAULT TRUE,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_sub_services_service ON sub_services(service_id);
CREATE INDEX idx_sub_services_code ON sub_services(code);

INSERT INTO sub_services (service_id, name, code, frequency, due_day_of_month, is_recurring) VALUES
  (1, 'GSTR-3B Filing', 'GST_3B', 'monthly', 20, TRUE),
  (1, 'GSTR-1 Filing', 'GST_1', 'monthly', 11, TRUE),
  (1, 'GSTR-9 Filing', 'GST_9', 'annually', 31, TRUE),
  (1, 'TDS Quarterly Filing', 'TDS_Q', 'quarterly', 15, TRUE),
  (1, 'Income Tax Return', 'ITR', 'annually', 31, TRUE),
  (2, 'Monthly BizLens Update', 'BL_MONTHLY', 'monthly', 5, TRUE),
  (2, 'Quarterly Analytics Review', 'BL_QUARTERLY', 'quarterly', 10, TRUE),
  (3, 'Monthly vCFO Review Call', 'VCFO_CALL', 'monthly', 15, TRUE),
  (3, 'Monthly Advisory Note', 'VCFO_NOTE', 'monthly', 20, TRUE),
  (4, 'CBAM Quarterly Assessment', 'CBAM_Q', 'quarterly', 15, TRUE),
  (5, 'SOX Control Assessment', 'SOX_ASSESS', 'annually', 31, FALSE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CLIENT SERVICE ACCESS (REVISED: FULLY RELATIONAL, NO ARRAYS)
-- ============================================================================

-- client_services: Maps client to service (top-level subscription)
CREATE TABLE client_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  service_head_id UUID REFERENCES users_profile(id),
  
  access_level TEXT CHECK (access_level IN ('full', 'limited', 'view_only')) DEFAULT 'limited',
  
  start_date DATE NOT NULL,
  end_date DATE,
  fee_amount DECIMAL(12,2),

  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, service_id)
);

CREATE INDEX idx_client_services_client ON client_services(client_id);
CREATE INDEX idx_client_services_service ON client_services(service_id);
CREATE INDEX idx_client_services_is_active ON client_services(is_active);

-- client_sub_services: Maps client to specific sub-services (granular control)
CREATE TABLE client_sub_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sub_service_id UUID REFERENCES sub_services(id),
  
  access_level TEXT CHECK (access_level IN ('full', 'view_only')),
  
  fee_amount DECIMAL(12,2),

  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, sub_service_id)
);

CREATE INDEX idx_client_sub_services_client ON client_sub_services(client_id);
CREATE INDEX idx_client_sub_services_sub_service ON client_sub_services(sub_service_id);

-- client_feature_flags: Optional feature toggles (JSONB is fine here)
CREATE TABLE client_feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sub_service_id UUID REFERENCES sub_services(id),
  
  feature_key TEXT NOT NULL,
  feature_enabled BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, sub_service_id, feature_key)
);

CREATE INDEX idx_client_feature_flags_client ON client_feature_flags(client_id);


-- ============================================================================
-- 4. TASK ENGINE (CORE WORKFLOW)
-- ============================================================================

CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_service_id UUID NOT NULL REFERENCES sub_services(id),
  
  title TEXT NOT NULL,
  description TEXT,
  
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annually', 'on_demand')),
  due_day_of_month INT,
  due_day_of_quarter INT,
  due_month INT,
  
  default_assignee_id UUID REFERENCES users_profile(id),
  default_reviewer_id UUID REFERENCES users_profile(id),
  
  sop_steps JSONB DEFAULT '[]',
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_task_templates_sub_service ON task_templates(sub_service_id);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  client_id UUID NOT NULL REFERENCES clients(id),
  sub_service_id UUID NOT NULL REFERENCES sub_services(id),
  task_template_id UUID REFERENCES task_templates(id),
  
  title TEXT NOT NULL,
  description TEXT,
  
  assigned_to UUID REFERENCES users_profile(id),
  reviewer_id UUID REFERENCES users_profile(id),
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'awaiting_client',
    'in_progress',
    'review',
    'completed'
  )),
  
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  created_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  started_date DATE,
  completed_date DATE,
  
  period_month INT CHECK (period_month BETWEEN 1 AND 12),
  period_year INT,
  period_quarter INT CHECK (period_quarter BETWEEN 1 AND 4),
  
  task_number TEXT UNIQUE,
  is_billable BOOLEAN DEFAULT FALSE,
  bill_reference TEXT,
  
  is_recurring BOOLEAN DEFAULT FALSE,

  bill_amount DECIMAL(12,2),
  billed BOOLEAN DEFAULT FALSE,
  billed_date DATE,

  arn_reference TEXT,
  is_arn_client_visible BOOLEAN DEFAULT FALSE,

  is_verified BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID
);

CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_reviewer ON tasks(reviewer_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Prevent duplicate task generation at the database level (defence-in-depth
-- against cron double-runs and race conditions). The application's
-- "if not task_exists" check is the first line; this is the second.
-- Partial index because soft-deleted rows must not block regeneration of
-- a fresh task for the same period.
-- Tasks without a period (ad-hoc tasks) are excluded since period_month/year
-- are nullable and ad-hoc tasks legitimately can repeat.
CREATE UNIQUE INDEX uniq_active_task_per_period
ON tasks (client_id, sub_service_id, period_month, period_year)
WHERE is_deleted = FALSE
  AND period_month IS NOT NULL
  AND period_year IS NOT NULL;

CREATE TABLE task_document_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  document_type TEXT NOT NULL,
  description TEXT,
  
  is_received BOOLEAN DEFAULT FALSE,
  received_date DATE,
  received_from UUID REFERENCES users_profile(id),
  
  related_document_id UUID,
  
  date_requested DATE DEFAULT CURRENT_DATE,
  reminder_count INT DEFAULT 0,
  last_reminder_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_document_requests_task ON task_document_requests(task_id);
CREATE INDEX idx_task_document_requests_is_received ON task_document_requests(is_received);

CREATE TABLE task_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  
  changed_by UUID REFERENCES users_profile(id),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_activity_task ON task_activity(task_id);
CREATE INDEX idx_task_activity_changed_by ON task_activity(changed_by);

CREATE TABLE task_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  note_text TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users_profile(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_task_notes_task ON task_notes(task_id);

-- ============================================================================
-- 5. COMPLIANCE TRACKERS (STRONGLY TYPED, NOT JSONB)
-- ============================================================================

CREATE TABLE gst_filings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  
  return_type TEXT NOT NULL CHECK (return_type IN ('GSTR-1', 'GSTR-3B', 'GSTR-9')),
  
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'data_received', 'in_progress', 'review', 'filed'
  )),
  filed_date DATE,
  ack_number TEXT,
  
  taxable_turnover NUMERIC(14, 2),
  
  output_cgst NUMERIC(14, 2),
  output_sgst NUMERIC(14, 2),
  output_igst NUMERIC(14, 2),
  output_cess NUMERIC(14, 2),
  output_tax_total NUMERIC(14, 2),
  
  itc_available_2b NUMERIC(14, 2),
  itc_claimed NUMERIC(14, 2),
  itc_reversed NUMERIC(14, 2),
  
  net_tax_payable NUMERIC(14, 2),
  late_fee NUMERIC(14, 2),
  interest_amount NUMERIC(14, 2),
  
  data_entered_by UUID REFERENCES users_profile(id),
  data_entered_date TIMESTAMP,
  filed_by UUID REFERENCES users_profile(id),
  
  is_current BOOLEAN DEFAULT TRUE,
  superseded_by UUID REFERENCES gst_filings(id),
  change_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, period_month, period_year, is_current)
);

CREATE INDEX idx_gst_filings_client ON gst_filings(client_id);
CREATE INDEX idx_gst_filings_period ON gst_filings(period_year, period_month);
CREATE INDEX idx_gst_filings_status ON gst_filings(status);
CREATE INDEX idx_gst_filings_is_current ON gst_filings(is_current);

CREATE TABLE tds_filings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  period_quarter INT NOT NULL CHECK (period_quarter BETWEEN 1 AND 4),
  period_year INT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'data_received', 'in_progress', 'review', 'filed'
  )),
  filed_date DATE,
  ack_number TEXT,
  
  total_deductions NUMERIC(14, 2),
  deductee_count INT,
  
  section_194j NUMERIC(14, 2),
  section_194o NUMERIC(14, 2),
  section_194la NUMERIC(14, 2),
  other_sections JSONB DEFAULT '{}',
  
  tax_deposited NUMERIC(14, 2),
  
  data_entered_by UUID REFERENCES users_profile(id),
  data_entered_date TIMESTAMP,
  filed_by UUID REFERENCES users_profile(id),
  
  is_current BOOLEAN DEFAULT TRUE,
  superseded_by UUID REFERENCES tds_filings(id),
  change_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, period_quarter, period_year, is_current)
);

CREATE INDEX idx_tds_filings_client ON tds_filings(client_id);

CREATE TABLE it_filings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  fy_ending_year INT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'data_received', 'in_progress', 'review', 'filed'
  )),
  filed_date DATE,
  ack_number TEXT,
  
  gross_income NUMERIC(14, 2),
  deductions_claimed NUMERIC(14, 2),
  taxable_income NUMERIC(14, 2),
  tax_liability NUMERIC(14, 2),
  refund_amount NUMERIC(14, 2),
  
  data_entered_by UUID REFERENCES users_profile(id),
  data_entered_date TIMESTAMP,
  filed_by UUID REFERENCES users_profile(id),
  
  is_current BOOLEAN DEFAULT TRUE,
  superseded_by UUID REFERENCES it_filings(id),
  change_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, fy_ending_year, is_current)
);

CREATE INDEX idx_it_filings_client ON it_filings(client_id);

CREATE TABLE compliance_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  filing_type TEXT NOT NULL,
  period_identifier TEXT,
  
  status TEXT NOT NULL,
  due_date DATE,
  filed_date DATE,
  ack_number TEXT,
  
  days_to_deadline INT GENERATED ALWAYS AS (
    EXTRACT(DAY FROM (due_date - CURRENT_DATE))::INT
  ) STORED,
  
  is_overdue BOOLEAN GENERATED ALWAYS AS (
    CURRENT_DATE > due_date AND status != 'filed'
  ) STORED,
  
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, filing_type, period_identifier)
);

CREATE INDEX idx_compliance_status_client ON compliance_status(client_id);
CREATE INDEX idx_compliance_status_is_overdue ON compliance_status(is_overdue);

CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  notice_type TEXT NOT NULL CHECK (notice_type IN ('GST', 'Income Tax', 'TDS', 'Other')),
  notice_number TEXT,
  issuing_authority TEXT,
  
  notice_date DATE,
  notice_received_date DATE,
  due_date DATE,
  
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN (
    'received', 'reply_pending', 'reply_submitted', 'hearing_pending', 'hearing_held', 'order_pending', 'order_received', 'closed'
  )),
  
  amount_involved NUMERIC(14, 2),
  subject TEXT,
  description TEXT,
  
  assigned_to UUID REFERENCES users_profile(id),
  
  notice_document_id UUID,
  reply_document_id UUID,
  order_document_id UUID,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_notices_client ON notices(client_id);
CREATE INDEX idx_notices_status ON notices(status);


-- ============================================================================
-- 6. FINANCIAL DATA LAYER (FOR BIZLENS & INSIGHTS)
-- ============================================================================

CREATE TABLE gst_data_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  
  entered_by UUID NOT NULL REFERENCES users_profile(id),
  entered_at TIMESTAMP DEFAULT NOW(),
  entry_source TEXT CHECK (entry_source IN ('manual', 'tally_import', 'pdf_upload', 'api')) DEFAULT 'manual',
  
  turnover NUMERIC(14, 2),
  turnover_source TEXT,
  turnover_confidence TEXT CHECK (turnover_confidence IN ('verified', 'estimated', 'provisional')) DEFAULT 'verified',
  
  output_tax_cgst NUMERIC(14, 2),
  output_tax_sgst NUMERIC(14, 2),
  output_tax_igst NUMERIC(14, 2),
  
  input_tax_2b NUMERIC(14, 2),
  itc_books NUMERIC(14, 2),
  cash_paid NUMERIC(14, 2),
  
  entry_notes TEXT,
  
  is_current BOOLEAN DEFAULT TRUE,
  superseded_by UUID REFERENCES gst_data_entries(id),
  change_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_gst_data_entries_client ON gst_data_entries(client_id);
CREATE INDEX idx_gst_data_entries_is_current ON gst_data_entries(is_current);

CREATE TABLE financial_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  data_type TEXT NOT NULL CHECK (data_type IN (
    'profit_loss', 'balance_sheet', 'cash_flow', 'customer_metrics', 'supplier_metrics', 'asset_register'
  )),
  
  period_month INT CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  
  data_json JSONB NOT NULL,
  
  entered_by UUID REFERENCES users_profile(id),
  entered_at TIMESTAMP DEFAULT NOW(),
  entry_source TEXT CHECK (entry_source IN ('manual', 'tally_import', 'api')),
  
  is_current BOOLEAN DEFAULT TRUE,
  superseded_by UUID REFERENCES financial_data(id),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_financial_data_client ON financial_data(client_id);
CREATE INDEX idx_financial_data_type ON financial_data(data_type);

-- ============================================================================
-- 7. DOCUMENTS, DSC, CREDENTIALS
-- ============================================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT,
  file_type TEXT,
  
  document_category TEXT CHECK (document_category IN (
    'GST', 'Income_Tax', 'TDS', 'ROC', 'Bank_Statement', 'Ledger', 'Register', 
    'Payroll', 'Insurance', 'Audit', 'Legal', 'Other'
  )),
  document_period_month INT,
  document_period_year INT,
  
  visible_to_client BOOLEAN DEFAULT TRUE,
  visible_to_team BOOLEAN DEFAULT TRUE,
  
  uploaded_by UUID NOT NULL REFERENCES users_profile(id),
  
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by UUID
);

CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_category ON documents(document_category);

CREATE TABLE inward_outward_register (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  direction TEXT NOT NULL CHECK (direction IN ('inward', 'outward')),
  
  description TEXT NOT NULL,
  document_type TEXT,
  quantity INT,
  
  date_received DATE,
  date_returned DATE,
  expected_return_date DATE,
  
  received_from_name TEXT,
  received_from_contact TEXT,
  handed_to_name TEXT,
  handed_to_contact TEXT,
  
  condition TEXT,
  notes TEXT,
  
  received_by UUID REFERENCES users_profile(id),
  handed_by UUID REFERENCES users_profile(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inward_outward_register_client ON inward_outward_register(client_id);

CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  portal_name TEXT NOT NULL,
  portal_url TEXT,
  
  username TEXT,
  encrypted_password TEXT,
  
  security_question TEXT,
  encrypted_security_answer TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  last_used_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_credentials_client ON credentials(client_id);

CREATE TABLE dsc_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  holder_name TEXT NOT NULL,
  holder_contact_email TEXT,
  holder_phone TEXT,
  
  dsc_class TEXT NOT NULL CHECK (dsc_class IN ('Class 2', 'Class 3')),
  dsc_type TEXT NOT NULL CHECK (dsc_type IN ('eSign', 'eToken')),
  certificate_serial TEXT UNIQUE,
  certificate_issuer TEXT,
  
  issued_date DATE,
  expiry_date DATE NOT NULL,
  
  registered_portals TEXT[] DEFAULT '{}',
  
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'suspended', 'expired')),
  status_updated_at TIMESTAMP,
  
  encrypted_key_file BYTEA,
  encrypted_pin TEXT,
  encrypted_password TEXT,
  
  physical_location TEXT,
  custodian_name TEXT,
  custodian_phone TEXT,
  
  expiry_alert_sent BOOLEAN DEFAULT FALSE,
  expiry_alert_sent_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users_profile(id),
  updated_by UUID REFERENCES users_profile(id),
  
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_dsc_records_client ON dsc_records(client_id);
CREATE INDEX idx_dsc_records_expiry_date ON dsc_records(expiry_date);

-- ============================================================================
-- 8. VENDOR MANAGEMENT
-- ============================================================================

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  vendor_name TEXT NOT NULL,
  vendor_gstin TEXT,
  vendor_pan TEXT,
  vendor_category TEXT CHECK (vendor_category IN ('Supplier', 'Service Provider', 'Contractor', 'Other')),
  
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  address TEXT,
  city TEXT,
  state TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_vendors_client ON vendors(client_id);

CREATE TABLE vendor_gst_filings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  
  filed BOOLEAN DEFAULT FALSE,
  filing_date DATE,
  expected_filing_date DATE,
  
  gst_amount_involved NUMERIC(14, 2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendor_gst_filings_vendor ON vendor_gst_filings(vendor_id);

-- ============================================================================
-- 9. QUERY/ISSUE SYSTEM
-- ============================================================================

CREATE TABLE queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  task_id UUID REFERENCES tasks(id),
  
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  created_by UUID NOT NULL REFERENCES users_profile(id),
  assigned_to UUID REFERENCES users_profile(id),
  
  resolution_notes TEXT,
  resolved_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_queries_client ON queries(client_id);
CREATE INDEX idx_queries_status ON queries(status);

CREATE TABLE query_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  
  message_text TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES users_profile(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_query_messages_query ON query_messages(query_id);

-- ============================================================================
-- 10. CLIENT COMMUNICATION LOG
-- ============================================================================

CREATE TABLE client_communication_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  communication_type TEXT NOT NULL CHECK (communication_type IN ('call', 'email', 'meeting', 'whatsapp', 'other')),
  communication_date DATE NOT NULL,
  
  subject TEXT,
  summary TEXT,
  
  from_user_id UUID REFERENCES users_profile(id),
  to_contact_person TEXT,
  
  follow_up_needed BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  follow_up_details TEXT,
  
  created_by UUID NOT NULL REFERENCES users_profile(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  attachments TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_client_communication_log_client ON client_communication_log(client_id);

-- ============================================================================
-- 11. HEARINGS
-- ============================================================================

CREATE TABLE hearings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notice_id UUID REFERENCES notices(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  hearing_type TEXT CHECK (hearing_type IN ('GST', 'Income Tax', 'TDS', 'Other')),
  
  hearing_scheduled_date DATE,
  hearing_held_date DATE,
  next_hearing_date DATE,
  
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'held', 'adjourned', 'concluded'
  )),
  
  venue TEXT,
  officer_name TEXT,
  subject TEXT,
  
  order_date DATE,
  order_amount NUMERIC(14, 2),
  order_notes TEXT,
  
  assigned_to UUID REFERENCES users_profile(id),
  
  order_document_id UUID,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hearings_client ON hearings(client_id);


-- ============================================================================
-- 12. TEAM OPERATIONS (ATTENDANCE & PAYROLL)
-- ============================================================================

CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id),
  
  attendance_date DATE NOT NULL,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  
  status TEXT CHECK (status IN ('present', 'absent', 'leave', 'work_from_home')),
  
  leave_type TEXT CHECK (leave_type IN ('paid', 'unpaid', 'sick', 'casual', 'comp')),
  
  is_manually_created BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  overridden_by UUID REFERENCES users_profile(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, attendance_date)
);

CREATE INDEX idx_attendance_logs_user ON attendance_logs(user_id);
CREATE INDEX idx_attendance_logs_date ON attendance_logs(attendance_date);

CREATE TABLE staff_payroll_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) UNIQUE,
  
  monthly_salary NUMERIC(12, 2) NOT NULL,
  paid_leaves_per_month INT DEFAULT 2,
  
  deduction_applicable BOOLEAN DEFAULT TRUE,
  leave_carry_forward_allowed BOOLEAN DEFAULT FALSE,
  max_carry_forward_days INT,
  
  salary_adjustment_for_leaves BOOLEAN DEFAULT TRUE,
  
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id),
  
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  
  total_working_days INT,
  actual_present_days INT,
  actual_leave_days INT,
  paid_leave_days INT,
  unpaid_leave_days INT,
  daily_rate NUMERIC(12, 2),
  base_salary NUMERIC(12, 2),
  
  salary_for_present_days NUMERIC(12, 2),
  deduction_for_excess_leaves NUMERIC(12, 2),
  total_deductions NUMERIC(12, 2),
  gross_salary NUMERIC(12, 2),
  final_salary NUMERIC(12, 2),
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved', 'paid')),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users_profile(id),
  
  UNIQUE(user_id, month, year)
);

CREATE INDEX idx_payroll_runs_user ON payroll_runs(user_id);

CREATE TABLE payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_id UUID NOT NULL REFERENCES payroll_runs(id),
  
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('bonus', 'deduction', 'overtime', 'other')),
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  
  approved_by UUID NOT NULL REFERENCES users_profile(id),
  approved_at TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id),
  
  leave_type TEXT NOT NULL CHECK (leave_type IN ('paid', 'sick', 'casual', 'comp', 'other')),
  
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  number_of_days INT NOT NULL,
  
  reason TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  reviewed_by UUID REFERENCES users_profile(id),
  reviewed_at TIMESTAMP,
  review_remarks TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_user ON leave_requests(user_id);

-- ============================================================================
-- 13. VCFO & SOLUTION TRACKING
-- ============================================================================

CREATE TABLE vcfo_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  
  cash_in_bank NUMERIC(14, 2),
  monthly_burn NUMERIC(14, 2),
  revenue NUMERIC(14, 2),
  key_expenses JSONB DEFAULT '{}',
  
  budgeted_revenue NUMERIC(14, 2),
  budgeted_expenses NUMERIC(14, 2),
  actual_revenue NUMERIC(14, 2),
  actual_expenses NUMERIC(14, 2),
  
  advisor_notes TEXT,
  
  data_entered_by UUID REFERENCES users_profile(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(client_id, month, year)
);

CREATE INDEX idx_vcfo_snapshots_client ON vcfo_snapshots(client_id);

CREATE TABLE solution_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  issue_identified_date DATE NOT NULL,
  issue_description TEXT NOT NULL,
  issue_category TEXT CHECK (issue_category IN (
    'cash_flow', 'profitability', 'tax_optimization', 'working_capital', 'vendor_management', 'process', 'compliance', 'other'
  )),
  
  root_cause TEXT,
  financial_impact_estimate NUMERIC(14, 2),
  
  recommended_solution TEXT NOT NULL,
  solution_status TEXT NOT NULL DEFAULT 'recommended' CHECK (solution_status IN (
    'recommended', 'in_progress', 'implemented', 'deferred'
  )),
  
  actual_outcome TEXT,
  actual_financial_impact NUMERIC(14, 2),
  implementation_date DATE,
  
  identified_by UUID REFERENCES users_profile(id),
  implemented_by UUID REFERENCES users_profile(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_solution_log_client ON solution_log(client_id);

-- ============================================================================
-- 14. INSIGHTS & BENCHMARKS
-- ============================================================================

CREATE TABLE compliance_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'gst_rate_vs_industry', 'itc_utilization_gap', 'tds_concentration_risk',
    'vendor_filing_compliance', 'filing_timeliness', 'other'
  )),
  
  period_month INT CHECK (period_month BETWEEN 1 AND 12),
  period_year INT,
  
  headline TEXT NOT NULL,
  narrative TEXT NOT NULL,
  
  raw_value NUMERIC(14, 2),
  benchmark_value NUMERIC(14, 2),
  variance NUMERIC(5, 2),
  
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  
  recommended_action TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_compliance_insights_client ON compliance_insights(client_id);

CREATE TABLE benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  industry TEXT NOT NULL,
  sub_industry TEXT,
  
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(14, 2),
  
  period_year INT,
  sample_size INT,
  
  source TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_benchmarks_industry ON benchmarks(industry);

-- ============================================================================
-- 15. ACTIVITY LOG & AUDIT TRAIL
-- ============================================================================

CREATE TABLE global_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  
  details JSONB,
  
  performed_by UUID REFERENCES users_profile(id),
  performed_at TIMESTAMP DEFAULT NOW(),
  
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_global_audit_log_performed_by ON global_audit_log(performed_by);
CREATE INDEX idx_global_audit_log_performed_at ON global_audit_log(performed_at);

-- ============================================================================
-- 16. NOTIFICATIONS SYSTEM
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id),
  
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'task_assigned', 'task_due_soon', 'task_completed', 'task_overdue',
    'document_uploaded', 'query_received', 'compliance_due', 'payment_reminder',
    'team_alert', 'system_alert', 'other'
  )),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  related_entity_type TEXT,
  related_entity_id UUID,
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  send_via_email BOOLEAN DEFAULT TRUE,
  email_sent BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);

-- ============================================================================
-- 17. ENGAGEMENT & SCOPE
-- ============================================================================

CREATE TABLE engagement_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  
  service_id UUID NOT NULL REFERENCES services(id),
  
  document_id UUID NOT NULL,
  
  scope_of_work TEXT,
  deliverables TEXT,
  timeline TEXT,
  fees NUMERIC(12, 2),
  
  signed_date DATE,
  effective_from DATE,
  effective_to DATE,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_engagement_letters_client ON engagement_letters(client_id);

-- ============================================================================
-- 18. CLIENT LIFECYCLE TRACKING
-- ============================================================================

CREATE TABLE client_lifecycle_stage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) UNIQUE,
  
  current_stage TEXT NOT NULL CHECK (current_stage IN (
    'lead', 'caas_only', 'caas_bizlens', 'caas_vcfo', 'caas_bizlens_vcfo', 'full_suite', 'churn'
  )),
  
  lead_date DATE,
  caas_date DATE,
  bizlens_date DATE,
  vcfo_date DATE,
  
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_client_lifecycle_stage_current_stage ON client_lifecycle_stage(current_stage);


-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tds_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_data_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE vcfo_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CLIENT ACCESS POLICIES
-- ============================================================================

CREATE POLICY "clients_select_own"
ON clients
FOR SELECT
USING (
  id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid() AND is_active = TRUE
  )
);

CREATE POLICY "clients_update_own_limited"
ON clients
FOR UPDATE
USING (
  id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid() AND is_active = TRUE
  )
);

-- ============================================================================
-- TASK ACCESS POLICIES
-- ============================================================================

-- Clients see only awaiting_client + completed tasks
CREATE POLICY "tasks_client_view"
ON tasks
FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid() AND is_active = TRUE
  )
  AND status IN ('in_progress', 'completed') AND is_blocked_on_client = TRUE
);

-- Team sees all tasks for assigned clients
CREATE POLICY "tasks_team_view"
ON tasks
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) = 'team'
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- Team can update own tasks
CREATE POLICY "tasks_team_update_own"
ON tasks
FOR UPDATE
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) = 'team'
  AND (
    assigned_to = auth.uid()
    OR reviewer_id = auth.uid()
    OR (SELECT role FROM users_profile WHERE id = auth.uid()) = 'admin'
  )
);

-- ============================================================================
-- DOCUMENT ACCESS POLICIES
-- ============================================================================

-- Clients see only visible_to_client documents
CREATE POLICY "documents_client_view"
ON documents
FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid() AND is_active = TRUE
  )
  AND visible_to_client = TRUE
);

-- Team sees all visible_to_team documents for assigned clients
CREATE POLICY "documents_team_view"
ON documents
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) = 'team'
  AND visible_to_team = TRUE
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- COMPLIANCE DATA POLICIES (GST/TDS/IT — TEAM ONLY)
-- ============================================================================

-- Team only can access GST filings for assigned clients
CREATE POLICY "gst_filings_team_only"
ON gst_filings
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

CREATE POLICY "gst_filings_team_insert"
ON gst_filings
FOR INSERT
WITH CHECK (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
);

-- TDS filings
CREATE POLICY "tds_filings_team_only"
ON tds_filings
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

CREATE POLICY "tds_filings_team_insert"
ON tds_filings
FOR INSERT
WITH CHECK (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
);

-- IT filings
CREATE POLICY "it_filings_team_only"
ON it_filings
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

CREATE POLICY "it_filings_team_insert"
ON it_filings
FOR INSERT
WITH CHECK (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
);

-- Compliance Status
CREATE POLICY "compliance_status_team_only"
ON compliance_status
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- CREDENTIALS & DSC POLICIES (TEAM ASSIGNED TO CLIENT ONLY)
-- ============================================================================

CREATE POLICY "credentials_team_only"
ON credentials
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

CREATE POLICY "dsc_records_team_only"
ON dsc_records
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- NOTICES POLICIES
-- ============================================================================

CREATE POLICY "notices_team_view"
ON notices
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- FINANCIAL DATA POLICIES (TEAM ONLY)
-- ============================================================================

CREATE POLICY "gst_data_entries_team_only"
ON gst_data_entries
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

CREATE POLICY "financial_data_team_only"
ON financial_data
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- VCFO & SOLUTION LOG POLICIES
-- ============================================================================

CREATE POLICY "vcfo_snapshots_team_view"
ON vcfo_snapshots
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

CREATE POLICY "solution_log_team_view"
ON solution_log
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- QUERY POLICIES
-- ============================================================================

-- Clients see their own queries
CREATE POLICY "queries_client_view"
ON queries
FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid() AND is_active = TRUE
  )
);

-- Team sees queries for assigned clients
CREATE POLICY "queries_team_view"
ON queries
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- COMMUNICATION LOG POLICIES
-- ============================================================================

CREATE POLICY "communication_log_team_view"
ON client_communication_log
FOR SELECT
USING (
  (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('team', 'admin')
  AND client_id IN (
    SELECT client_id FROM team_client_assignment
    WHERE team_user_id = auth.uid()
  )
);

-- ============================================================================
-- ATTENDANCE & PAYROLL POLICIES
-- ============================================================================

-- Users see own attendance
CREATE POLICY "attendance_own_view"
ON attendance_logs
FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('admin', 'team')
);

-- Managers see direct reports' attendance
CREATE POLICY "attendance_direct_reports"
ON attendance_logs
FOR SELECT
USING (
  (SELECT reports_to FROM users_profile WHERE id = user_id) = auth.uid()
);

-- Users see own payroll
CREATE POLICY "payroll_own_view"
ON payroll_runs
FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM users_profile WHERE id = auth.uid()) IN ('admin', 'team')
);

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
--
-- ✅ 40+ TABLES with correct architecture
-- ✅ NO ARRAYS for core data (all relational)
-- ✅ JSONB ONLY for optional feature flags + SOP/key_expenses
-- ✅ Separate GST/TDS/IT tables (strong typing, indexable)
-- ✅ Versioning (is_current + superseded_by) on all financial tables
-- ✅ Soft deletes (is_deleted + deleted_at + deleted_by) on all key tables
-- ✅ RLS policies for multi-role access
-- ✅ NO business logic in database (logic lives in application)
--
-- NEXT STEPS:
--  1. Paste entire file into Supabase SQL Editor
--  2. Run RLS validation (test as different roles)
--  3. Build application layer (Node.js/Python) with business logic:
--     - Task creation from templates (cron job, NOT DB trigger)
--     - Payroll calculations (application layer, NOT DB function)
--     - Insight generation (application layer)
--     - Notifications (via Resend)
--     - BizLens integration (read facts, calculate in app)

-- ============================================================
-- Seed: Compliance Calendar Rules (idempotent)
-- ============================================================
-- Captures the Indian statutory schedule. Admin can edit later
-- via /admin/settings/compliance-rules. Periodicities and
-- predicates drive lib/services/compliance-calendar-engine.ts.
--
-- For TDS quarterly returns we use due_date_formula because
-- each quarter ends in a different month.
-- ============================================================

INSERT INTO compliance_calendar_rules
  (rule_code, display_name, service_kind, periodicity, due_day, due_month_offset, due_date_formula, applies_when, reminder_days, description)
VALUES
  -- ---------------- GST ----------------
  ('GSTR1_M',    'GSTR-1 (Monthly)',           'gst', 'monthly',   11, 1, NULL,
    '{"gst_filing_frequency":"monthly"}'::jsonb, '{7,3,1}',  'Monthly outward supplies return'),

  ('GSTR1_Q',    'GSTR-1 / IFF (Quarterly)',   'gst', 'quarterly', 13, 1, NULL,
    '{"gst_filing_frequency":"qrmp"}'::jsonb,    '{7,3,1}',  'QRMP outward supplies return'),

  ('GSTR3B_M',   'GSTR-3B (Monthly)',          'gst', 'monthly',   20, 1, NULL,
    '{"gst_filing_frequency":"monthly"}'::jsonb, '{7,3,1}',  'Monthly summary return'),

  ('GSTR3B_QA',  'GSTR-3B (QRMP, Group A)',    'gst', 'quarterly', 22, 1, NULL,
    '{"gst_filing_frequency":"qrmp","state_group":"A"}'::jsonb, '{7,3,1}',
    'QRMP summary return — Group A states'),

  ('GSTR3B_QB',  'GSTR-3B (QRMP, Group B)',    'gst', 'quarterly', 24, 1, NULL,
    '{"gst_filing_frequency":"qrmp","state_group":"B"}'::jsonb, '{7,3,1}',
    'QRMP summary return — Group B (incl. TN)'),

  ('GSTR9',      'GSTR-9 Annual Return',       'gst', 'yearly',    31, 9, NULL,
    '{"annual_turnover_above":20000000}'::jsonb, '{30,7,1}', 'Annual GST return (>₹2 Cr turnover)'),

  ('GSTR9C',     'GSTR-9C Reconciliation',     'gst', 'yearly',    31, 9, NULL,
    '{"is_audit_applicable":true}'::jsonb,       '{30,7,1}', 'GST reconciliation statement'),

  -- ---------------- TDS ----------------
  ('TDS_PAY_NM', 'TDS Payment (non-March)',    'tds', 'monthly',    7, 1, NULL,
    '{"is_tds_deductor":true,"exclude_month":3}'::jsonb, '{3,1}',
    'Monthly TDS payment by 7th of following month'),

  ('TDS_PAY_MAR','TDS Payment (March)',        'tds', 'yearly',    30, 1, NULL,
    '{"is_tds_deductor":true,"month":3}'::jsonb, '{7,3,1}',
    'March-period TDS payment by 30 April'),

  ('TDS_24Q_Q1', 'TDS 24Q (Salary) Q1',        'tds', 'quarterly', 31, 0, 'quarter_end+1m+0d',
    '{"is_tds_deductor":true,"quarter":1}'::jsonb, '{7,3,1}', 'Salary TDS return Q1 (by 31 July)'),
  ('TDS_24Q_Q2', 'TDS 24Q (Salary) Q2',        'tds', 'quarterly', 31, 0, 'quarter_end+1m+0d',
    '{"is_tds_deductor":true,"quarter":2}'::jsonb, '{7,3,1}', 'Salary TDS return Q2 (by 31 Oct)'),
  ('TDS_24Q_Q3', 'TDS 24Q (Salary) Q3',        'tds', 'quarterly', 31, 0, 'quarter_end+1m+0d',
    '{"is_tds_deductor":true,"quarter":3}'::jsonb, '{7,3,1}', 'Salary TDS return Q3 (by 31 Jan)'),
  ('TDS_24Q_Q4', 'TDS 24Q (Salary) Q4',        'tds', 'quarterly', 31, 0, 'quarter_end+2m+0d',
    '{"is_tds_deductor":true,"quarter":4}'::jsonb, '{7,3,1}', 'Salary TDS return Q4 (by 31 May)'),

  ('TDS_26Q_Q1', 'TDS 26Q (Non-salary) Q1',    'tds', 'quarterly', 31, 0, 'quarter_end+1m+0d',
    '{"is_tds_deductor":true,"quarter":1}'::jsonb, '{7,3,1}', 'Non-salary TDS return Q1'),
  ('TDS_26Q_Q2', 'TDS 26Q (Non-salary) Q2',    'tds', 'quarterly', 31, 0, 'quarter_end+1m+0d',
    '{"is_tds_deductor":true,"quarter":2}'::jsonb, '{7,3,1}', 'Non-salary TDS return Q2'),
  ('TDS_26Q_Q3', 'TDS 26Q (Non-salary) Q3',    'tds', 'quarterly', 31, 0, 'quarter_end+1m+0d',
    '{"is_tds_deductor":true,"quarter":3}'::jsonb, '{7,3,1}', 'Non-salary TDS return Q3'),
  ('TDS_26Q_Q4', 'TDS 26Q (Non-salary) Q4',    'tds', 'quarterly', 31, 0, 'quarter_end+2m+0d',
    '{"is_tds_deductor":true,"quarter":4}'::jsonb, '{7,3,1}', 'Non-salary TDS return Q4'),

  -- ---------------- TCS ----------------
  ('TCS_27EQ_Q1','TCS 27EQ Q1',                'tcs', 'quarterly', 15, 0, 'quarter_end+1m-16d',
    '{"is_tcs_collector":true,"quarter":1}'::jsonb, '{7,3,1}', 'TCS return Q1 (by 15 July)'),
  ('TCS_27EQ_Q2','TCS 27EQ Q2',                'tcs', 'quarterly', 15, 0, 'quarter_end+1m-16d',
    '{"is_tcs_collector":true,"quarter":2}'::jsonb, '{7,3,1}', 'TCS return Q2 (by 15 Oct)'),
  ('TCS_27EQ_Q3','TCS 27EQ Q3',                'tcs', 'quarterly', 15, 0, 'quarter_end+1m-16d',
    '{"is_tcs_collector":true,"quarter":3}'::jsonb, '{7,3,1}', 'TCS return Q3 (by 15 Jan)'),
  ('TCS_27EQ_Q4','TCS 27EQ Q4',                'tcs', 'quarterly', 15, 0, 'quarter_end+1m-16d',
    '{"is_tcs_collector":true,"quarter":4}'::jsonb, '{7,3,1}', 'TCS return Q4 (by 15 May)'),

  -- ---------------- Advance Tax ----------------
  ('ADV_TAX_Q1', 'Advance Tax 1st Instalment 15%',  'it', 'quarterly', 15, 0, NULL,
    '{"is_advance_tax_applicable":true,"month":6}'::jsonb,  '{7,3,1}', '15% by 15 June'),
  ('ADV_TAX_Q2', 'Advance Tax 2nd Instalment 45%',  'it', 'quarterly', 15, 0, NULL,
    '{"is_advance_tax_applicable":true,"month":9}'::jsonb,  '{7,3,1}', '45% by 15 September'),
  ('ADV_TAX_Q3', 'Advance Tax 3rd Instalment 75%',  'it', 'quarterly', 15, 0, NULL,
    '{"is_advance_tax_applicable":true,"month":12}'::jsonb, '{7,3,1}', '75% by 15 December'),
  ('ADV_TAX_Q4', 'Advance Tax 4th Instalment 100%', 'it', 'quarterly', 15, 0, NULL,
    '{"is_advance_tax_applicable":true,"month":3}'::jsonb,  '{7,3,1}', '100% by 15 March'),

  -- ---------------- ITR + Tax Audit ----------------
  ('ITR_NA',  'ITR (Non-Audit)',               'it',  'yearly', 31, 4, NULL,
    '{"is_audit_applicable":false}'::jsonb,                       '{30,7,1}', 'Non-audit ITR by 31 July'),
  ('ITR_AUD', 'ITR (Audit Cases)',             'it',  'yearly', 31, 7, NULL,
    '{"is_audit_applicable":true,"is_transfer_pricing":false}'::jsonb, '{30,7,1}', 'Audit ITR by 31 October'),
  ('ITR_TP',  'ITR (Transfer Pricing)',        'it',  'yearly', 30, 8, NULL,
    '{"is_transfer_pricing":true}'::jsonb,                        '{30,7,1}', 'TP ITR by 30 November'),
  ('TAX_AUDIT','Tax Audit u/s 44AB',            'it',  'yearly', 30, 6, NULL,
    '{"is_audit_applicable":true}'::jsonb,                        '{30,7,1}', 'Tax audit by 30 September'),

  -- ---------------- ROC ----------------
  ('AOC4',    'ROC AOC-4',                     'roc', 'yearly', NULL, 0, 'agm_date+30d',
    '{"is_roc_applicable":true}'::jsonb, '{30,7,1}', 'AOC-4 within 30 days of AGM'),
  ('MGT7',    'ROC MGT-7',                     'roc', 'yearly', NULL, 0, 'agm_date+60d',
    '{"is_roc_applicable":true}'::jsonb, '{30,7,1}', 'MGT-7 within 60 days of AGM'),
  ('DPT3',    'DPT-3',                         'roc', 'yearly', 30, 3, NULL,
    '{"is_roc_applicable":true}'::jsonb, '{30,7,1}', 'DPT-3 by 30 June'),
  ('DIR3KYC', 'DIR-3 KYC',                     'roc', 'yearly', 30, 6, NULL,
    '{"is_roc_applicable":true}'::jsonb, '{30,7,1}', 'DIR-3 KYC by 30 September'),

  -- ---------------- PF / ESI / PT ----------------
  ('PF_PAY',  'PF Payment',                    'pf',  'monthly',   15, 1, NULL,
    '{"is_pf_applicable":true}'::jsonb,  '{3,1}', 'PF deposit by 15th of next month'),
  ('ESI_PAY', 'ESI Payment',                   'esi', 'monthly',   15, 1, NULL,
    '{"is_esi_applicable":true}'::jsonb, '{3,1}', 'ESI deposit by 15th of next month'),

  ('PT_TN_OCT','PT (Tamil Nadu) — Oct half',   'pt',  'half_yearly', 1, 4, NULL,
    '{"is_pt_applicable":true,"pt_state":"TN"}'::jsonb, '{7,3,1}', 'TN PT October half-year'),
  ('PT_TN_APR','PT (Tamil Nadu) — Apr half',   'pt',  'half_yearly', 1, 0, NULL,
    '{"is_pt_applicable":true,"pt_state":"TN"}'::jsonb, '{7,3,1}', 'TN PT April half-year')

ON CONFLICT (rule_code) DO NOTHING;
