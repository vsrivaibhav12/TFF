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
