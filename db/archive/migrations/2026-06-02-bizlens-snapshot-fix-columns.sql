-- Fix bizlens_period_snapshots to align with repository expectations
-- Adds data_json (for generic key-value storage from prior-periods-panel)
-- and months_covered (for coverage period tracking)

ALTER TABLE bizlens_period_snapshots
  ADD COLUMN IF NOT EXISTS data_json JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS months_covered INT DEFAULT 12;
