-- ============================================================================
-- Drop dead / orphaned tables identified in the 2026-06-13 audit cleanup
-- ============================================================================
-- These tables are defined in schema files but are never queried by app/lib
-- code. CASCADE removes dependent constraints/indexes without dropping
-- referencing tables.
--
-- Run via: npx tsx scripts/apply-schema-cleanup.ts
-- ============================================================================

-- Legacy / duplicated work-log table (replaced by task_workdone)
DROP TABLE IF EXISTS work_done CASCADE;

-- Unused firm configuration table (data lives in billing_entities)
DROP TABLE IF EXISTS firm_profile CASCADE;

-- Unused document request modules
DROP TABLE IF EXISTS document_requests CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS sub_service_document_request_templates CASCADE;

-- Unused vendor modules
DROP TABLE IF EXISTS vendor_gst_filings CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;

-- Unused task document linking table
DROP TABLE IF EXISTS task_document_requests CASCADE;

-- Unused payroll adjustment table
DROP TABLE IF EXISTS payroll_adjustments CASCADE;

-- Unused HR tables
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;

-- financial_data is kept: scripts/migrate-bizlens.ts still references it

-- Unused client lifecycle / communication tables
DROP TABLE IF EXISTS engagement_letters CASCADE;
DROP TABLE IF EXISTS client_lifecycle_stage CASCADE;
DROP TABLE IF EXISTS client_feature_flags CASCADE;
DROP TABLE IF EXISTS client_communication_log CASCADE;

-- Unused benchmarking table
DROP TABLE IF EXISTS benchmarks CASCADE;
