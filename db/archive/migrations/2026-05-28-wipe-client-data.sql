-- ============================================================================
-- WIPE ALL CLIENT DATA
-- ============================================================================
-- Purpose: Hard-delete every client and all associated child records while
-- preserving the service catalogue (services, sub_services, task_templates,
-- task_template_steps, sub_service_sop_steps, service_categories) and user
-- accounts (users_profile, auth.users).
--
-- WARNING: This is destructive and irreversible. Run only when you truly
-- intend to start fresh.
--
-- Each DELETE is wrapped in a safe block so missing tables (schema drift)
-- are silently skipped rather than aborting the script.
-- ============================================================================

DO $$
BEGIN
  -- 1. Child tables of queries
  DELETE FROM query_messages;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'query_messages not found, skipping';
END $$;

DO $$
BEGIN
  -- 2. Tables that reference both tasks and clients (must go before tasks)
  DELETE FROM work_done;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'work_done not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM queries;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'queries not found, skipping';
END $$;

DO $$
BEGIN
  -- 3. Child tables of tasks (CASCADE, but explicit for clarity)
  DELETE FROM task_steps;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'task_steps not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM task_activity;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'task_activity not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM task_notes;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'task_notes not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM task_document_requests;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'task_document_requests not found, skipping';
END $$;

DO $$
BEGIN
  -- 4. Child tables of vendors (vendors itself has CASCADE on clients)
  DELETE FROM vendor_gst_filings;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'vendor_gst_filings not found, skipping';
END $$;

DO $$
BEGIN
  -- 5. Child tables of notices
  DELETE FROM hearings;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'hearings not found, skipping';
END $$;

DO $$
BEGIN
  -- 6. All remaining client-referencing tables (no particular order)
  DELETE FROM credentials;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'credentials not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM dsc_records;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'dsc_records not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_communication_log;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_communication_log not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM inward_outward_register;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'inward_outward_register not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM documents;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'documents not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM financial_data;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'financial_data not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM gst_data_entries;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'gst_data_entries not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM compliance_insights;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'compliance_insights not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM solution_log;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'solution_log not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM vcfo_snapshots;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'vcfo_snapshots not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM bizlens_period_snapshots;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'bizlens_period_snapshots not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM gst_monthly_data;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'gst_monthly_data not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_portal_visibility;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_portal_visibility not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_feature_flags;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_feature_flags not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_sub_services;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_sub_services not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_services;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_services not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM compliance_status;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'compliance_status not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM it_filings;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'it_filings not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM tds_filings;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'tds_filings not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM gst_filings;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'gst_filings not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM notices;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'notices not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM tasks;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'tasks not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_lifecycle_stage;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_lifecycle_stage not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM engagement_letters;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'engagement_letters not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM team_client_assignment;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'team_client_assignment not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_users;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_users not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM vendors;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'vendors not found, skipping';
END $$;

DO $$
BEGIN
  -- 7. The parent table (CASCADE children already handled above)
  DELETE FROM clients;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'clients not found, skipping';
END $$;

DO $$
BEGIN
  -- 8. Client groups and import history
  DELETE FROM client_groups;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_groups not found, skipping';
END $$;

DO $$
BEGIN
  DELETE FROM client_import_batches;
EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'client_import_batches not found, skipping';
END $$;
