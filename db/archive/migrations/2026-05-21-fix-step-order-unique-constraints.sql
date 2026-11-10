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
