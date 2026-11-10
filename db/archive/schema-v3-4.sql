-- ============================================================================
-- SCHEMA v3.4 — Promote migration-only objects into the canonical schema chain
-- ============================================================================
-- This file makes the main schema chain self-contained by including objects
-- that were originally added via one-off migrations.
--
-- Apply via: npx tsx scripts/apply-v3-4.ts
-- Idempotent — safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. bizlens_period_snapshots
-- ----------------------------------------------------------------------------
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

-- Defensive: ensure period columns exist for indexes (older migration copies may be missing them)
ALTER TABLE bizlens_period_snapshots
  ADD COLUMN IF NOT EXISTS period_month INT,
  ADD COLUMN IF NOT EXISTS period_year INT,
  ADD COLUMN IF NOT EXISTS period_quarter INT;

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

-- ----------------------------------------------------------------------------
-- 2. gst_monthly_data
-- ----------------------------------------------------------------------------
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

ALTER TABLE gst_monthly_data
  ADD COLUMN IF NOT EXISTS period_month INT,
  ADD COLUMN IF NOT EXISTS period_year INT;

CREATE INDEX IF NOT EXISTS idx_gst_monthly_client ON gst_monthly_data(client_id, period_year, period_month);

ALTER TABLE gst_monthly_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gst_data_team ON gst_monthly_data;
CREATE POLICY gst_data_team ON gst_monthly_data FOR ALL TO authenticated USING (
  public.current_user_role() IN ('admin','team')
  OR client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
);

-- ----------------------------------------------------------------------------
-- 3. income_tax_slabs
-- ----------------------------------------------------------------------------
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

ALTER TABLE income_tax_slabs
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS assessment_year TEXT,
  ADD COLUMN IF NOT EXISTS regime TEXT,
  ADD COLUMN IF NOT EXISTS min_income NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS max_income NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS rate_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS surcharge_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS cess_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_tax_slabs_lookup ON income_tax_slabs(category, assessment_year, regime, is_active);

ALTER TABLE income_tax_slabs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS its_admin ON income_tax_slabs;
CREATE POLICY its_admin ON income_tax_slabs FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');
DROP POLICY IF EXISTS its_read_all ON income_tax_slabs;
CREATE POLICY its_read_all ON income_tax_slabs FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 4. v_unified_inbox view
-- ----------------------------------------------------------------------------
-- SECURITY INVOKER ensures RLS on underlying tables is respected.
-- All underlying queries filter is_deleted = false (or equivalent status filter).

-- Guard: compliance_calendar_events gained is_deleted in a later migration.
-- Add it idempotently so this file can run independently.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'compliance_calendar_events' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE compliance_calendar_events ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

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


-- ----------------------------------------------------------------------------
-- 3b. financial_data (retained — legacy migration script still references it)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_data (
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

CREATE INDEX IF NOT EXISTS idx_financial_data_client ON financial_data(client_id);
CREATE INDEX IF NOT EXISTS idx_financial_data_type ON financial_data(data_type);
