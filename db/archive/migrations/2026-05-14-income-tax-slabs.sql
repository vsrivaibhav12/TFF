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
