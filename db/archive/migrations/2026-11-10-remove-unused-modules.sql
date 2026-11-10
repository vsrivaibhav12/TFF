-- ============================================================================
-- 2026-11-10  Remove unused modules
--
-- BizLens, vCFO, the client portal, notices, hearings, the query messenger,
-- payroll, GST / TDS / income-tax filings, tax projections, insights and
-- saved views were never used (every table below held 0 rows when this was
-- written) and their code has been deleted.
--
-- Safety: the whole file runs as one transaction and REFUSES to drop any table
-- that now contains data. No CASCADE is used, so if a policy or view on a kept
-- table still depends on a dropped table the statement fails instead of
-- silently removing that policy.
--
-- Restoring any module = restore its code from git and re-run its schema file
-- (db/schema*.sql).
-- ============================================================================

DO $$
DECLARE
  t text;
  n bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'notices', 'hearings', 'queries', 'query_messages',
    'payroll_runs', 'staff_payroll_settings',
    'gst_filings', 'tds_filings', 'it_filings', 'gst_monthly_data', 'gst_data_entries',
    'financial_data', 'bizlens_data', 'bizlens_period_snapshots', 'vcfo_snapshots',
    'solution_log', 'compliance_insights', 'saved_views',
    'client_portal_visibility', 'income_tax_slabs'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      IF n > 0 THEN
        RAISE EXCEPTION 'Refusing to drop public.%: it contains % rows', t, n;
      END IF;
    END IF;
  END LOOP;
END $$;

-- The inbox view reads notices and queries: drop it first, recreate below.
DROP VIEW IF EXISTS public.v_unified_inbox;

DROP TABLE IF EXISTS
  public.query_messages,
  public.queries,
  public.hearings,
  public.notices,
  public.payroll_runs,
  public.staff_payroll_settings,
  public.gst_filings,
  public.tds_filings,
  public.it_filings,
  public.gst_monthly_data,
  public.gst_data_entries,
  public.financial_data,
  public.bizlens_data,
  public.bizlens_period_snapshots,
  public.vcfo_snapshots,
  public.solution_log,
  public.compliance_insights,
  public.saved_views,
  public.client_portal_visibility,
  public.income_tax_slabs;

-- Inbox: open tasks plus upcoming compliance events (notices/queries removed).
CREATE VIEW public.v_unified_inbox
WITH (security_invoker = true) AS
SELECT t.id,
       'task'::text AS item_type,
       t.title,
       t.status,
       t.priority,
       t.due_date,
       t.created_at AS occurred_at,
       t.assigned_to AS actor_id,
       t.client_id,
       c.business_name AS client_name,
       NULL::uuid AS related_entity_id,
       NULL::text AS related_entity_type,
       jsonb_build_object('task_number', t.task_number, 'is_stuck', t.is_stuck,
                          'is_blocked_on_client', t.is_blocked_on_client) AS meta
  FROM public.tasks t
  LEFT JOIN public.clients c ON c.id = t.client_id
 WHERE t.is_deleted = false AND t.status = ANY (ARRAY['pending'::text, 'in_progress'::text])
UNION ALL
SELECT e.id,
       'compliance'::text AS item_type,
       r.display_name AS title,
       e.status,
       'medium'::text AS priority,
       e.due_date,
       e.generated_at AS occurred_at,
       NULL::uuid AS actor_id,
       e.client_id,
       c.business_name AS client_name,
       e.task_id AS related_entity_id,
       'task'::text AS related_entity_type,
       jsonb_build_object('rule_code', r.rule_code, 'service_kind', r.service_kind,
                          'period_label', e.period_label) AS meta
  FROM public.compliance_calendar_events e
  LEFT JOIN public.compliance_calendar_rules r ON r.id = e.rule_id
  LEFT JOIN public.clients c ON c.id = e.client_id
 WHERE e.task_id IS NULL AND e.is_deleted = false;

GRANT SELECT ON public.v_unified_inbox TO authenticated;
