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
