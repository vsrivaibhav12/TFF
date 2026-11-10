-- The all_work_items view has been removed (see migrations/2026-06-02-drop-insecure-all-work-items.sql).
-- It was unreferenced in application code, lacked SECURITY INVOKER, and bypassed RLS.
DROP VIEW IF EXISTS all_work_items;
