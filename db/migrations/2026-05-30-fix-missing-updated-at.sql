-- Fix missing updated_at columns flagged by schema drift audit
-- 2026-05-30

ALTER TABLE service_categories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE task_workdone
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
