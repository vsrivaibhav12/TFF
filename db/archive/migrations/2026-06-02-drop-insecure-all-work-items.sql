-- Drop insecure all_work_items view
-- Reason: No SECURITY INVOKER, bypasses RLS, unreferenced in application code.
-- Replaced by service-layer composition (lib/services/work-hub-service.ts) when needed.
DROP VIEW IF EXISTS all_work_items;
