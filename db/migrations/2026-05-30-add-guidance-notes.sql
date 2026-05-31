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
