-- Fix schema drift identified by audit_schema_drift.py
-- Date: 2026-06-04

-- 1. task_steps is missing guidance_notes (referenced in lib/actions/task-steps.ts)
ALTER TABLE task_steps
  ADD COLUMN IF NOT EXISTS guidance_notes TEXT;

-- 2. Ensure updated_at triggers exist for tables that need them
-- (service_categories and services already have updated_at in schema.sql)

-- 3. Add comment for clarity
COMMENT ON COLUMN task_steps.guidance_notes IS 'Optional guidance copied from template/SOP step or added ad-hoc';
