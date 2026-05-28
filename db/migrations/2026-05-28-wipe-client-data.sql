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
-- ============================================================================

-- 1. Child tables of queries
DELETE FROM query_messages;

-- 2. Tables that reference both tasks and clients (must go before tasks)
DELETE FROM work_done;
DELETE FROM queries;

-- 3. Child tables of tasks (CASCADE, but explicit for clarity)
DELETE FROM task_steps;
DELETE FROM task_activity;
DELETE FROM task_notes;
DELETE FROM task_document_requests;

-- 4. Child tables of vendors (vendors itself has CASCADE on clients)
DELETE FROM vendor_gst_filings;

-- 5. Child tables of notices
DELETE FROM hearings;

-- 6. All remaining client-referencing tables (no particular order)
DELETE FROM credentials;
DELETE FROM dsc_records;
DELETE FROM client_communication_log;
DELETE FROM inward_outward_register;
DELETE FROM documents;
DELETE FROM financial_data;
DELETE FROM gst_data_entries;
DELETE FROM compliance_insights;
DELETE FROM solution_log;
DELETE FROM vcfo_snapshots;
DELETE FROM bizlens_period_snapshots;
DELETE FROM gst_monthly_data;
DELETE FROM client_portal_visibility;
DELETE FROM client_feature_flags;
DELETE FROM client_sub_services;
DELETE FROM client_services;
DELETE FROM compliance_status;
DELETE FROM it_filings;
DELETE FROM tds_filings;
DELETE FROM gst_filings;
DELETE FROM notices;
DELETE FROM tasks;
DELETE FROM client_lifecycle_stage;
DELETE FROM engagement_letters;
DELETE FROM team_client_assignment;
DELETE FROM client_users;
DELETE FROM vendors;

-- 7. The parent table (CASCADE children already handled above)
DELETE FROM clients;

-- 8. Client groups and import history
DELETE FROM client_groups;
DELETE FROM client_import_batches;
