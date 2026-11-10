-- ============================================================================
-- The Fiscal Fulcrum: baseline schema
-- Generated 2026-11-11 from the live Supabase database (public schema).
--
-- This one file replaces the older db/schema*.sql, db/rls*.sql, db/fix-*.sql and
-- db/migrations/* files (kept in db/archive for history). To build a new database:
--   1. run this file;  2. run db/seeds/*.sql;  3. apply any newer files in db/migrations.
-- Add every future change as a new dated file in db/migrations.
-- ============================================================================

SET check_function_bodies = off;
SET search_path = public, extensions;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE public."attendance_logs" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "user_id" uuid NOT NULL,
  "attendance_date" date NOT NULL,
  "check_in_time" timestamp with time zone,
  "check_out_time" timestamp with time zone,
  "status" text,
  "leave_type" text,
  "is_manually_created" boolean DEFAULT false,
  "override_reason" text,
  "overridden_by" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "check_in_lat" numeric(9,6),
  "check_in_lng" numeric(9,6),
  "check_in_accuracy_m" integer,
  "check_in_address" text,
  "check_out_lat" numeric(10,8),
  "check_out_lng" numeric(11,8),
  "check_out_address" text
);

CREATE TABLE public."billing_entities" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "name" text NOT NULL,
  "legal_name" text,
  "gstin" text,
  "pan" text,
  "address_line1" text,
  "address_line2" text,
  "city" text,
  "state" text,
  "pincode" text,
  "invoice_prefix" text NOT NULL,
  "default_profit_centre_code" text,
  "signing_authority_name" text,
  "signing_authority_designation" text,
  "bank_account_name" text,
  "bank_account_number" text,
  "bank_ifsc" text,
  "bank_name" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."client_compliance_profiles" (
  "client_id" uuid NOT NULL,
  "gst_filing_frequency" text,
  "state_group" text,
  "entity_type" text,
  "is_audit_applicable" boolean DEFAULT false NOT NULL,
  "is_tds_deductor" boolean DEFAULT false NOT NULL,
  "is_tcs_collector" boolean DEFAULT false NOT NULL,
  "is_advance_tax_applicable" boolean DEFAULT false NOT NULL,
  "is_pf_applicable" boolean DEFAULT false NOT NULL,
  "is_esi_applicable" boolean DEFAULT false NOT NULL,
  "is_pt_applicable" boolean DEFAULT false NOT NULL,
  "pt_state" text,
  "is_roc_applicable" boolean DEFAULT false NOT NULL,
  "agm_date" date,
  "is_transfer_pricing" boolean DEFAULT false NOT NULL,
  "annual_turnover_estimate" numeric(15,2),
  "fy_start_month" integer DEFAULT 4 NOT NULL,
  "notes" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."client_groups" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "is_deleted" boolean DEFAULT false
);

CREATE TABLE public."client_import_batches" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "uploaded_by" uuid NOT NULL,
  "uploaded_at" timestamp without time zone DEFAULT now(),
  "source_filename" text,
  "total_rows" integer NOT NULL,
  "successful_rows" integer DEFAULT 0 NOT NULL,
  "skipped_rows" integer DEFAULT 0 NOT NULL,
  "error_rows" integer DEFAULT 0 NOT NULL,
  "errors" jsonb DEFAULT '[]'::jsonb,
  "status" text DEFAULT 'completed'::text NOT NULL
);

CREATE TABLE public."client_services" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "client_id" uuid NOT NULL,
  "service_id" uuid NOT NULL,
  "access_level" text DEFAULT 'limited'::text,
  "start_date" date NOT NULL,
  "end_date" date,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "service_head_id" uuid,
  "fee_amount" numeric(12,2)
);

CREATE TABLE public."client_sub_services" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "client_id" uuid NOT NULL,
  "sub_service_id" uuid NOT NULL,
  "access_level" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "fee_amount" numeric(12,2)
);

CREATE TABLE public."clients" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "business_name" text NOT NULL,
  "business_registration_number" text,
  "pan" text,
  "gstin" text,
  "category" text,
  "residential_status" text,
  "industry" text,
  "primary_contact_person" text,
  "primary_contact_email" text,
  "primary_contact_phone" text,
  "address_line_1" text,
  "address_line_2" text,
  "city" text,
  "state" text,
  "pincode" text,
  "group_id" uuid,
  "priority_tier" text DEFAULT 'standard'::text,
  "lifecycle_stage" text DEFAULT 'lead'::text,
  "primary_owner_id" uuid,
  "start_date" date,
  "contract_value_annual" numeric(12,2),
  "contract_renewal_date" date,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "notes" text,
  "is_deleted" boolean DEFAULT false,
  "deleted_at" timestamp without time zone,
  "deleted_by" uuid,
  "default_profit_centre_code" text,
  "default_cost_centre_code" text,
  "default_billing_entity_id" uuid,
  "plan_tier" text DEFAULT 'caas_growth'::text
);

CREATE TABLE public."compliance_calendar_events" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "client_id" uuid NOT NULL,
  "rule_id" uuid,
  "rule_code" text NOT NULL,
  "period_label" text NOT NULL,
  "due_date" date NOT NULL,
  "status" text DEFAULT 'upcoming'::text NOT NULL,
  "task_id" uuid,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sub_service_id" uuid,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid
);

CREATE TABLE public."compliance_calendar_rules" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "rule_code" text NOT NULL,
  "display_name" text NOT NULL,
  "service_kind" text NOT NULL,
  "periodicity" text NOT NULL,
  "due_day" integer,
  "due_month_offset" integer DEFAULT 1 NOT NULL,
  "due_date_formula" text,
  "applies_when" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "reminder_days" integer[] DEFAULT '{7,3,1}'::integer[] NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sub_service_id" uuid
);

CREATE TABLE public."compliance_status" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "client_id" uuid NOT NULL,
  "filing_type" text NOT NULL,
  "period_identifier" text,
  "status" text NOT NULL,
  "due_date" date,
  "filed_date" date,
  "ack_number" text,
  "days_to_deadline" integer,
  "is_overdue" boolean DEFAULT false,
  "updated_at" timestamp without time zone DEFAULT now(),
  "is_deleted" boolean DEFAULT false NOT NULL
);

CREATE TABLE public."cost_centres" (
  "code" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."credentials" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "client_id" uuid NOT NULL,
  "portal_name" text NOT NULL,
  "portal_url" text,
  "username" text,
  "encrypted_password" text,
  "security_question" text,
  "encrypted_security_answer" text,
  "is_active" boolean DEFAULT true,
  "last_used_date" date,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "is_deleted" boolean DEFAULT false
);

CREATE TABLE public."dsc_records" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "client_id" uuid NOT NULL,
  "holder_name" text NOT NULL,
  "holder_contact_email" text,
  "holder_phone" text,
  "dsc_class" text NOT NULL,
  "dsc_type" text NOT NULL,
  "certificate_serial" text,
  "certificate_issuer" text,
  "issued_date" date,
  "expiry_date" date NOT NULL,
  "registered_portals" text[] DEFAULT '{}'::text[],
  "status" text DEFAULT 'active'::text NOT NULL,
  "status_updated_at" timestamp without time zone,
  "encrypted_key_file" bytea,
  "encrypted_pin" text,
  "encrypted_password" text,
  "physical_location" text,
  "custodian_name" text,
  "custodian_phone" text,
  "expiry_alert_sent" boolean DEFAULT false,
  "expiry_alert_sent_date" date,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid,
  "is_deleted" boolean DEFAULT false,
  "certificate_file_path" text,
  "certificate_file_name" text
);

CREATE TABLE public."global_audit_log" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "action" text NOT NULL,
  "entity_type" text,
  "entity_id" uuid,
  "details" jsonb,
  "performed_by" uuid,
  "performed_at" timestamp without time zone DEFAULT now(),
  "ip_address" text,
  "user_agent" text
);

CREATE TABLE public."leave_requests" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "user_id" uuid NOT NULL,
  "leave_type" text NOT NULL,
  "from_date" date NOT NULL,
  "to_date" date NOT NULL,
  "number_of_days" integer NOT NULL,
  "reason" text,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "reviewed_by" uuid,
  "reviewed_at" timestamp without time zone,
  "review_remarks" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
);

CREATE TABLE public."notification_preferences" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "user_id" uuid NOT NULL,
  "email_frequency" text DEFAULT 'daily'::text NOT NULL,
  "in_app_enabled" boolean DEFAULT true,
  "updated_at" timestamp without time zone DEFAULT now()
);

CREATE TABLE public."notifications" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "user_id" uuid NOT NULL,
  "notification_type" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "related_entity_type" text,
  "related_entity_id" uuid,
  "is_read" boolean DEFAULT false,
  "read_at" timestamp without time zone,
  "send_via_email" boolean DEFAULT true,
  "email_sent" boolean DEFAULT false,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
);

CREATE TABLE public."permission_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "request_date" date NOT NULL,
  "from_time" time without time zone,
  "to_time" time without time zone,
  "reason" text,
  "status" text DEFAULT 'pending'::text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp without time zone,
  "review_remarks" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
);

CREATE TABLE public."profit_centres" (
  "code" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."rate_limit_counters" (
  "key" text NOT NULL,
  "window_start" timestamp with time zone NOT NULL,
  "hits" integer DEFAULT 0 NOT NULL
);

CREATE TABLE public."service_categories" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "display_order" integer,
  "created_at" timestamp without time zone DEFAULT now(),
  "is_deleted" boolean DEFAULT false,
  "updated_at" timestamp without time zone DEFAULT now()
);

CREATE TABLE public."services" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "category_id" uuid,
  "name" text NOT NULL,
  "code" text,
  "description" text,
  "icon_url" text,
  "display_order" integer,
  "created_at" timestamp without time zone DEFAULT now(),
  "is_deleted" boolean DEFAULT false,
  "service_kind" text,
  "updated_at" timestamp without time zone DEFAULT now()
);

CREATE TABLE public."staff_capabilities" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "user_id" uuid NOT NULL,
  "capability" text NOT NULL,
  "granted_at" timestamp without time zone DEFAULT now(),
  "granted_by" uuid NOT NULL,
  "revoked_at" timestamp without time zone,
  "revoked_by" uuid
);

CREATE TABLE public."staff_role_template_capabilities" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "template_id" uuid NOT NULL,
  "capability" text NOT NULL
);

CREATE TABLE public."staff_role_templates" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "created_by" uuid,
  "is_deleted" boolean DEFAULT false
);

CREATE TABLE public."sub_service_sop_steps" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "sub_service_id" uuid NOT NULL,
  "step_order" integer NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "is_required" boolean DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "is_deleted" boolean DEFAULT false,
  "guidance_notes" text
);

CREATE TABLE public."sub_services" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "service_id" uuid NOT NULL,
  "name" text NOT NULL,
  "code" text,
  "description" text,
  "frequency" text,
  "due_day_of_month" integer,
  "due_day_of_quarter" integer,
  "due_month" integer,
  "is_billable" boolean DEFAULT true,
  "is_recurring" boolean DEFAULT true,
  "requires_client_input" boolean DEFAULT true,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "is_deleted" boolean DEFAULT false,
  "requires_verification" boolean DEFAULT false NOT NULL
);

CREATE TABLE public."task_activity" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "task_id" uuid NOT NULL,
  "action" text NOT NULL,
  "field_name" text,
  "old_value" text,
  "new_value" text,
  "changed_by" uuid,
  "created_at" timestamp without time zone DEFAULT now()
);

CREATE TABLE public."task_assignees" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "task_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "assigned_at" timestamp without time zone DEFAULT now(),
  "assigned_by" uuid
);

CREATE TABLE public."task_custom_field_definitions" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "service_id" uuid,
  "sub_service_id" uuid,
  "field_key" text NOT NULL,
  "display_label" text NOT NULL,
  "field_type" text NOT NULL,
  "options_json" jsonb,
  "is_required" boolean DEFAULT false NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."task_custom_field_values" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "task_id" uuid NOT NULL,
  "definition_id" uuid NOT NULL,
  "value_text" text,
  "value_number" numeric(20,4),
  "value_date" date,
  "value_bool" boolean,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."task_label_assignments" (
  "task_id" uuid NOT NULL,
  "label_code" text NOT NULL,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."task_labels" (
  "code" text NOT NULL,
  "display_name" text NOT NULL,
  "color_hex" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."task_notes" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "task_id" uuid NOT NULL,
  "note_text" text NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "is_deleted" boolean DEFAULT false
);

CREATE TABLE public."task_steps" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "task_id" uuid NOT NULL,
  "step_order" integer NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "is_required" boolean DEFAULT true,
  "completed_at" timestamp without time zone,
  "completed_by" uuid,
  "completion_note" text,
  "source_sop_step_id" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "source_template_step_id" uuid,
  "guidance_notes" text
);

CREATE TABLE public."task_template_steps" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "task_template_id" uuid NOT NULL,
  "step_order" integer NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "is_required" boolean DEFAULT true,
  "guidance_notes" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "is_deleted" boolean DEFAULT false
);

CREATE TABLE public."task_templates" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "sub_service_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "frequency" text NOT NULL,
  "due_day_of_month" integer,
  "due_day_of_quarter" integer,
  "due_month" integer,
  "default_assignee_id" uuid,
  "default_reviewer_id" uuid,
  "sop_steps" jsonb DEFAULT '[]'::jsonb,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "is_deleted" boolean DEFAULT false,
  "estimated_days" integer
);

CREATE TABLE public."task_workdone" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "task_id" uuid,
  "user_id" uuid NOT NULL,
  "client_id" uuid,
  "work_date" date NOT NULL,
  "duration_minutes" integer NOT NULL,
  "note" text,
  "entry_method" text NOT NULL,
  "started_at" timestamp with time zone,
  "ended_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp without time zone DEFAULT now()
);

CREATE TABLE public."tasks" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "client_id" uuid NOT NULL,
  "sub_service_id" uuid,
  "task_template_id" uuid,
  "title" text NOT NULL,
  "description" text,
  "assigned_to" uuid,
  "reviewer_id" uuid,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "priority" text DEFAULT 'medium'::text,
  "created_date" date DEFAULT CURRENT_DATE,
  "due_date" date,
  "started_date" date,
  "completed_date" date,
  "period_month" integer,
  "period_year" integer,
  "is_recurring" boolean DEFAULT false,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "is_deleted" boolean DEFAULT false,
  "deleted_at" timestamp without time zone,
  "deleted_by" uuid,
  "is_blocked_on_client" boolean DEFAULT false NOT NULL,
  "is_stuck" boolean DEFAULT false NOT NULL,
  "stuck_reason_code" text,
  "stuck_reason_note" text,
  "client_approval_required" boolean DEFAULT false NOT NULL,
  "verification_status" text DEFAULT 'not_required'::text NOT NULL,
  "verified_by_user_id" uuid,
  "verified_at" timestamp with time zone,
  "verification_note" text,
  "profit_centre_code" text,
  "cost_centre_code" text,
  "billing_entity_id" uuid,
  "estimated_hours" numeric(8,2),
  "custom_fields" jsonb DEFAULT '{}'::jsonb,
  "labels" text[] DEFAULT '{}'::text[],
  "service_head_id" uuid,
  "bill_amount" numeric(12,2),
  "billed" boolean DEFAULT false,
  "billed_date" date,
  "arn_reference" text,
  "is_arn_client_visible" boolean DEFAULT false,
  "is_verified" boolean DEFAULT false,
  "task_number" text,
  "is_billable" boolean DEFAULT false,
  "bill_reference" text,
  "period_quarter" integer
);

CREATE TABLE public."team_client_assignment" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "team_user_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "role" text DEFAULT 'lead'::text,
  "assigned_from" date NOT NULL,
  "assigned_to" date,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
);

CREATE TABLE public."user_billing_entity_access" (
  "user_id" uuid NOT NULL,
  "billing_entity_id" uuid NOT NULL,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."users_profile" (
  "id" uuid NOT NULL,
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "phone_number" text,
  "role" text NOT NULL,
  "job_title" text,
  "department" text,
  "is_active" boolean DEFAULT true,
  "is_verified" boolean DEFAULT false,
  "reports_to" uuid,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  "last_login" timestamp without time zone,
  "is_deleted" boolean DEFAULT false,
  "deleted_at" timestamp without time zone,
  "deleted_by" uuid,
  "active_role_template_id" uuid,
  "geo_check_in_required" boolean DEFAULT false NOT NULL,
  "is_prime_admin" boolean DEFAULT false,
  "manager_id" uuid,
  "monthly_salary" numeric(12,2),
  "paid_leaves_per_month" numeric(4,1) DEFAULT 1.0
);

CREATE TABLE public."weekly_timesheet_submissions" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "user_id" uuid NOT NULL,
  "manager_id" uuid,
  "week_start" date NOT NULL,
  "week_end" date NOT NULL,
  "status" text DEFAULT 'draft'::text NOT NULL,
  "present_days" integer DEFAULT 0,
  "leave_days" integer DEFAULT 0,
  "wfh_days" integer DEFAULT 0,
  "half_days" integer DEFAULT 0,
  "permission_hours" numeric(4,1) DEFAULT 0,
  "submitted_at" timestamp without time zone,
  "approved_at" timestamp without time zone,
  "approved_by" uuid,
  "review_remarks" text,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Constraints
-- ---------------------------------------------------------------------------
ALTER TABLE ONLY public.attendance_logs ADD CONSTRAINT "attendance_logs_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.billing_entities ADD CONSTRAINT "billing_entities_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.client_compliance_profiles ADD CONSTRAINT "client_compliance_profiles_pkey" PRIMARY KEY (client_id);
ALTER TABLE ONLY public.client_groups ADD CONSTRAINT "client_groups_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.client_import_batches ADD CONSTRAINT "client_import_batches_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.client_services ADD CONSTRAINT "client_services_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.client_sub_services ADD CONSTRAINT "client_sub_services_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.clients ADD CONSTRAINT "clients_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.compliance_calendar_events ADD CONSTRAINT "compliance_calendar_events_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.compliance_calendar_rules ADD CONSTRAINT "compliance_calendar_rules_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.compliance_status ADD CONSTRAINT "compliance_status_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.cost_centres ADD CONSTRAINT "cost_centres_pkey" PRIMARY KEY (code);
ALTER TABLE ONLY public.credentials ADD CONSTRAINT "credentials_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.dsc_records ADD CONSTRAINT "dsc_records_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.global_audit_log ADD CONSTRAINT "global_audit_log_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT "leave_requests_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.notification_preferences ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.permission_requests ADD CONSTRAINT "permission_requests_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.profit_centres ADD CONSTRAINT "profit_centres_pkey" PRIMARY KEY (code);
ALTER TABLE ONLY public.rate_limit_counters ADD CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY (key, window_start);
ALTER TABLE ONLY public.service_categories ADD CONSTRAINT "service_categories_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.services ADD CONSTRAINT "services_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_capabilities ADD CONSTRAINT "staff_capabilities_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_role_template_capabilities ADD CONSTRAINT "staff_role_template_capabilities_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_role_templates ADD CONSTRAINT "staff_role_templates_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.sub_service_sop_steps ADD CONSTRAINT "sub_service_sop_steps_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.sub_services ADD CONSTRAINT "sub_services_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.task_activity ADD CONSTRAINT "task_activity_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.task_assignees ADD CONSTRAINT "task_assignees_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.task_custom_field_definitions ADD CONSTRAINT "task_custom_field_definitions_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.task_custom_field_values ADD CONSTRAINT "task_custom_field_values_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.task_label_assignments ADD CONSTRAINT "task_label_assignments_pkey" PRIMARY KEY (task_id, label_code);
ALTER TABLE ONLY public.task_labels ADD CONSTRAINT "task_labels_pkey" PRIMARY KEY (code);
ALTER TABLE ONLY public.task_notes ADD CONSTRAINT "task_notes_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.task_steps ADD CONSTRAINT "task_steps_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.task_template_steps ADD CONSTRAINT "task_template_steps_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.task_templates ADD CONSTRAINT "task_templates_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.task_workdone ADD CONSTRAINT "task_workdone_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.team_client_assignment ADD CONSTRAINT "team_client_assignment_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.user_billing_entity_access ADD CONSTRAINT "user_billing_entity_access_pkey" PRIMARY KEY (user_id, billing_entity_id);
ALTER TABLE ONLY public.users_profile ADD CONSTRAINT "users_profile_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.weekly_timesheet_submissions ADD CONSTRAINT "weekly_timesheet_submissions_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY public.attendance_logs ADD CONSTRAINT "attendance_logs_user_id_attendance_date_key" UNIQUE (user_id, attendance_date);
ALTER TABLE ONLY public.client_services ADD CONSTRAINT "client_services_client_id_service_id_key" UNIQUE (client_id, service_id);
ALTER TABLE ONLY public.client_sub_services ADD CONSTRAINT "client_sub_services_client_id_sub_service_id_key" UNIQUE (client_id, sub_service_id);
ALTER TABLE ONLY public.compliance_calendar_events ADD CONSTRAINT "compliance_calendar_events_client_id_rule_id_period_label_key" UNIQUE (client_id, rule_id, period_label);
ALTER TABLE ONLY public.compliance_calendar_rules ADD CONSTRAINT "compliance_calendar_rules_rule_code_key" UNIQUE (rule_code);
ALTER TABLE ONLY public.compliance_status ADD CONSTRAINT "compliance_status_client_id_filing_type_period_identifier_key" UNIQUE (client_id, filing_type, period_identifier);
ALTER TABLE ONLY public.notification_preferences ADD CONSTRAINT "notification_preferences_user_id_key" UNIQUE (user_id);
ALTER TABLE ONLY public.staff_capabilities ADD CONSTRAINT "staff_capabilities_user_id_capability_key" UNIQUE (user_id, capability);
ALTER TABLE ONLY public.staff_role_template_capabilities ADD CONSTRAINT "staff_role_template_capabilities_template_id_capability_key" UNIQUE (template_id, capability);
ALTER TABLE ONLY public.task_assignees ADD CONSTRAINT "task_assignees_task_id_user_id_role_key" UNIQUE (task_id, user_id, role);
ALTER TABLE ONLY public.task_custom_field_values ADD CONSTRAINT "task_custom_field_values_task_id_definition_id_key" UNIQUE (task_id, definition_id);
ALTER TABLE ONLY public.task_steps ADD CONSTRAINT "task_steps_task_id_step_order_key" UNIQUE (task_id, step_order);
ALTER TABLE ONLY public.users_profile ADD CONSTRAINT "users_profile_email_key" UNIQUE (email);
ALTER TABLE ONLY public.weekly_timesheet_submissions ADD CONSTRAINT "weekly_timesheet_submissions_user_id_week_start_key" UNIQUE (user_id, week_start);
ALTER TABLE ONLY public.attendance_logs ADD CONSTRAINT "attendance_logs_leave_type_check" CHECK ((leave_type = ANY (ARRAY['paid'::text, 'unpaid'::text, 'sick'::text, 'casual'::text, 'comp'::text])));
ALTER TABLE ONLY public.attendance_logs ADD CONSTRAINT "attendance_logs_status_check" CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'leave'::text, 'work_from_home'::text])));
ALTER TABLE ONLY public.client_compliance_profiles ADD CONSTRAINT "client_compliance_profiles_entity_type_check" CHECK ((entity_type = ANY (ARRAY['company'::text, 'llp'::text, 'firm'::text, 'proprietorship'::text, 'huf'::text, 'trust'::text, 'aop'::text, 'boi'::text, 'individual'::text])));
ALTER TABLE ONLY public.client_compliance_profiles ADD CONSTRAINT "client_compliance_profiles_gst_filing_frequency_check" CHECK ((gst_filing_frequency = ANY (ARRAY['monthly'::text, 'qrmp'::text, 'not_applicable'::text])));
ALTER TABLE ONLY public.client_compliance_profiles ADD CONSTRAINT "client_compliance_profiles_state_group_check" CHECK (((state_group = ANY (ARRAY['A'::text, 'B'::text])) OR (state_group IS NULL)));
ALTER TABLE ONLY public.client_import_batches ADD CONSTRAINT "client_import_batches_status_check" CHECK ((status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text])));
ALTER TABLE ONLY public.client_services ADD CONSTRAINT "client_services_access_level_check" CHECK ((access_level = ANY (ARRAY['full'::text, 'limited'::text, 'view_only'::text])));
ALTER TABLE ONLY public.client_sub_services ADD CONSTRAINT "client_sub_services_access_level_check" CHECK ((access_level = ANY (ARRAY['full'::text, 'view_only'::text])));
ALTER TABLE ONLY public.clients ADD CONSTRAINT "clients_category_check" CHECK ((category = ANY (ARRAY['sole_proprietor'::text, 'partnership'::text, 'llp'::text, 'pvt_ltd'::text, 'public_ltd'::text, 'huf'::text, 'aop'::text, 'ngo'::text, 'other'::text])));
ALTER TABLE ONLY public.clients ADD CONSTRAINT "clients_gstin_length_check" CHECK (((gstin IS NULL) OR (length(gstin) = 15)));
ALTER TABLE ONLY public.clients ADD CONSTRAINT "clients_lifecycle_stage_check" CHECK ((lifecycle_stage = ANY (ARRAY['lead'::text, 'caas_only'::text, 'caas_bizlens'::text, 'caas_vcfo'::text, 'caas_bizlens_vcfo'::text, 'full_suite'::text, 'churn'::text])));
ALTER TABLE ONLY public.clients ADD CONSTRAINT "clients_pan_length_check" CHECK (((pan IS NULL) OR (length(pan) = 10)));
ALTER TABLE ONLY public.clients ADD CONSTRAINT "clients_plan_tier_check" CHECK ((plan_tier = ANY (ARRAY['caas_starter'::text, 'caas_growth'::text, 'caas_enterprise'::text, 'bizlens_only'::text, 'vcfo_essential'::text, 'vcfo_growth'::text, 'vcfo_premium'::text, 'process_controls'::text, 'cbam_esg'::text])));
ALTER TABLE ONLY public.clients ADD CONSTRAINT "clients_priority_tier_check" CHECK ((priority_tier = ANY (ARRAY['standard'::text, 'premium'::text, 'strategic'::text])));
ALTER TABLE ONLY public.clients ADD CONSTRAINT "clients_residential_status_check" CHECK ((residential_status = ANY (ARRAY['resident'::text, 'non_resident'::text])));
ALTER TABLE ONLY public.compliance_calendar_events ADD CONSTRAINT "compliance_calendar_events_status_check" CHECK ((status = ANY (ARRAY['upcoming'::text, 'task_created'::text, 'filed'::text, 'overdue'::text, 'dismissed'::text])));
ALTER TABLE ONLY public.dsc_records ADD CONSTRAINT "dsc_records_dsc_class_check" CHECK ((dsc_class = ANY (ARRAY['Class 2'::text, 'Class 3'::text])));
ALTER TABLE ONLY public.dsc_records ADD CONSTRAINT "dsc_records_dsc_type_check" CHECK ((dsc_type = ANY (ARRAY['eSign'::text, 'eToken'::text])));
ALTER TABLE ONLY public.dsc_records ADD CONSTRAINT "dsc_records_expiry_check" CHECK ((expiry_date > issued_date));
ALTER TABLE ONLY public.dsc_records ADD CONSTRAINT "dsc_records_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text, 'suspended'::text, 'expired'::text])));
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT "leave_requests_date_order_check" CHECK ((to_date >= from_date));
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT "leave_requests_leave_type_check" CHECK ((leave_type = ANY (ARRAY['paid'::text, 'sick'::text, 'casual'::text, 'comp'::text, 'other'::text])));
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT "leave_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
ALTER TABLE ONLY public.notification_preferences ADD CONSTRAINT "notification_preferences_email_frequency_check" CHECK ((email_frequency = ANY (ARRAY['immediate'::text, 'daily'::text, 'weekly'::text, 'off'::text])));
ALTER TABLE ONLY public.notifications ADD CONSTRAINT "notifications_notification_type_check" CHECK ((notification_type = ANY (ARRAY['task_assigned'::text, 'task_due_soon'::text, 'task_completed'::text, 'task_overdue'::text, 'document_uploaded'::text, 'query_received'::text, 'compliance_due'::text, 'payment_reminder'::text, 'team_alert'::text, 'system_alert'::text, 'other'::text])));
ALTER TABLE ONLY public.permission_requests ADD CONSTRAINT "permission_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
ALTER TABLE ONLY public.services ADD CONSTRAINT "services_service_kind_check" CHECK (((service_kind IS NULL) OR (service_kind = ANY (ARRAY['gst'::text, 'tds'::text, 'income_tax'::text, 'compliance'::text, 'bizlens'::text, 'vcfo'::text, 'notice'::text, 'payroll'::text, 'other'::text]))));
ALTER TABLE ONLY public.sub_services ADD CONSTRAINT "sub_services_due_day_of_month_check" CHECK (((due_day_of_month >= 1) AND (due_day_of_month <= 31)));
ALTER TABLE ONLY public.sub_services ADD CONSTRAINT "sub_services_frequency_check" CHECK ((frequency = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'annually'::text, 'on_demand'::text])));
ALTER TABLE ONLY public.task_assignees ADD CONSTRAINT "task_assignees_role_check" CHECK ((role = ANY (ARRAY['assignee'::text, 'reviewer'::text])));
ALTER TABLE ONLY public.task_custom_field_definitions ADD CONSTRAINT "task_custom_field_definitions_check" CHECK (((service_id IS NOT NULL) OR (sub_service_id IS NOT NULL)));
ALTER TABLE ONLY public.task_custom_field_definitions ADD CONSTRAINT "task_custom_field_definitions_field_type_check" CHECK ((field_type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'dropdown'::text, 'boolean'::text])));
ALTER TABLE ONLY public.task_templates ADD CONSTRAINT "task_templates_frequency_check" CHECK ((frequency = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'annually'::text, 'on_demand'::text])));
ALTER TABLE ONLY public.task_workdone ADD CONSTRAINT "task_workdone_duration_minutes_check" CHECK (((duration_minutes > 0) AND (duration_minutes <= 1440)));
ALTER TABLE ONLY public.task_workdone ADD CONSTRAINT "task_workdone_entry_method_check" CHECK ((entry_method = ANY (ARRAY['timer'::text, 'manual'::text])));
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "chk_tasks_client_approval_required" CHECK ((client_approval_required = ANY (ARRAY[true, false])));
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "chk_tasks_is_blocked_on_client" CHECK ((is_blocked_on_client = ANY (ARRAY[true, false])));
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "chk_tasks_is_stuck" CHECK ((is_stuck = ANY (ARRAY[true, false])));
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "chk_tasks_verification_status" CHECK ((verification_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'verified'::text])));
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_due_date_check" CHECK ((due_date >= (created_at)::date));
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_period_month_check" CHECK (((period_month >= 1) AND (period_month <= 12)));
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_period_quarter_check" CHECK (((period_quarter >= 1) AND (period_quarter <= 4)));
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])));
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])));
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_stuck_reason_check" CHECK (((stuck_reason_code IS NULL) OR (stuck_reason_code = ANY (ARRAY['client_clarification'::text, 'gst_portal_down'::text, 'itd_portal_down'::text, 'mcadown'::text, 'mismatch_investigation'::text, 'awaiting_third_party'::text, 'awaiting_management'::text, 'dsc_issue'::text, 'payment_pending'::text, 'other'::text]))));
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_verification_status_check" CHECK ((verification_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'verified'::text])));
ALTER TABLE ONLY public.team_client_assignment ADD CONSTRAINT "team_client_assignment_role_check" CHECK ((role = ANY (ARRAY['lead'::text, 'support'::text, 'reviewer'::text])));
ALTER TABLE ONLY public.users_profile ADD CONSTRAINT "users_profile_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'team'::text])));
ALTER TABLE ONLY public.weekly_timesheet_submissions ADD CONSTRAINT "weekly_timesheet_submissions_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text])));
ALTER TABLE ONLY public.attendance_logs ADD CONSTRAINT "attendance_logs_overridden_by_fkey" FOREIGN KEY (overridden_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.attendance_logs ADD CONSTRAINT "attendance_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users_profile(id);
ALTER TABLE ONLY public.billing_entities ADD CONSTRAINT "billing_entities_default_profit_centre_code_fkey" FOREIGN KEY (default_profit_centre_code) REFERENCES profit_centres(code);
ALTER TABLE ONLY public.client_compliance_profiles ADD CONSTRAINT "client_compliance_profiles_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.client_import_batches ADD CONSTRAINT "client_import_batches_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.client_services ADD CONSTRAINT "client_services_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.client_services ADD CONSTRAINT "client_services_service_head_id_fkey" FOREIGN KEY (service_head_id) REFERENCES users_profile(id);
ALTER TABLE ONLY public.client_services ADD CONSTRAINT "client_services_service_id_fkey" FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.client_sub_services ADD CONSTRAINT "client_sub_services_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.client_sub_services ADD CONSTRAINT "client_sub_services_sub_service_id_fkey" FOREIGN KEY (sub_service_id) REFERENCES sub_services(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.clients ADD CONSTRAINT "clients_default_billing_entity_id_fkey" FOREIGN KEY (default_billing_entity_id) REFERENCES billing_entities(id);
ALTER TABLE ONLY public.clients ADD CONSTRAINT "clients_default_cost_centre_code_fkey" FOREIGN KEY (default_cost_centre_code) REFERENCES cost_centres(code);
ALTER TABLE ONLY public.clients ADD CONSTRAINT "clients_default_profit_centre_code_fkey" FOREIGN KEY (default_profit_centre_code) REFERENCES profit_centres(code);
ALTER TABLE ONLY public.clients ADD CONSTRAINT "clients_group_id_fkey" FOREIGN KEY (group_id) REFERENCES client_groups(id);
ALTER TABLE ONLY public.clients ADD CONSTRAINT "clients_primary_owner_id_fkey" FOREIGN KEY (primary_owner_id) REFERENCES users_profile(id);
ALTER TABLE ONLY public.compliance_calendar_events ADD CONSTRAINT "compliance_calendar_events_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.compliance_calendar_events ADD CONSTRAINT "compliance_calendar_events_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.compliance_calendar_events ADD CONSTRAINT "compliance_calendar_events_rule_id_fkey" FOREIGN KEY (rule_id) REFERENCES compliance_calendar_rules(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.compliance_calendar_events ADD CONSTRAINT "compliance_calendar_events_sub_service_id_fkey" FOREIGN KEY (sub_service_id) REFERENCES sub_services(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.compliance_calendar_events ADD CONSTRAINT "compliance_calendar_events_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.compliance_calendar_rules ADD CONSTRAINT "compliance_calendar_rules_sub_service_id_fkey" FOREIGN KEY (sub_service_id) REFERENCES sub_services(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.compliance_status ADD CONSTRAINT "compliance_status_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.credentials ADD CONSTRAINT "credentials_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id);
ALTER TABLE ONLY public.dsc_records ADD CONSTRAINT "dsc_records_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id);
ALTER TABLE ONLY public.dsc_records ADD CONSTRAINT "dsc_records_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.dsc_records ADD CONSTRAINT "dsc_records_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.global_audit_log ADD CONSTRAINT "global_audit_log_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT "leave_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users_profile(id);
ALTER TABLE ONLY public.notification_preferences ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users_profile(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notifications ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users_profile(id);
ALTER TABLE ONLY public.permission_requests ADD CONSTRAINT "permission_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users_profile(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.permission_requests ADD CONSTRAINT "permission_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users_profile(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.services ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY (category_id) REFERENCES service_categories(id);
ALTER TABLE ONLY public.staff_capabilities ADD CONSTRAINT "staff_capabilities_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.staff_capabilities ADD CONSTRAINT "staff_capabilities_revoked_by_fkey" FOREIGN KEY (revoked_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.staff_capabilities ADD CONSTRAINT "staff_capabilities_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users_profile(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.staff_role_template_capabilities ADD CONSTRAINT "staff_role_template_capabilities_template_id_fkey" FOREIGN KEY (template_id) REFERENCES staff_role_templates(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.staff_role_templates ADD CONSTRAINT "staff_role_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.sub_service_sop_steps ADD CONSTRAINT "sub_service_sop_steps_sub_service_id_fkey" FOREIGN KEY (sub_service_id) REFERENCES sub_services(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.sub_services ADD CONSTRAINT "sub_services_service_id_fkey" FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_activity ADD CONSTRAINT "task_activity_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.task_activity ADD CONSTRAINT "task_activity_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_assignees ADD CONSTRAINT "task_assignees_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.task_assignees ADD CONSTRAINT "task_assignees_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_assignees ADD CONSTRAINT "task_assignees_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users_profile(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_custom_field_definitions ADD CONSTRAINT "task_custom_field_definitions_service_id_fkey" FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_custom_field_definitions ADD CONSTRAINT "task_custom_field_definitions_sub_service_id_fkey" FOREIGN KEY (sub_service_id) REFERENCES sub_services(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_custom_field_values ADD CONSTRAINT "task_custom_field_values_definition_id_fkey" FOREIGN KEY (definition_id) REFERENCES task_custom_field_definitions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_custom_field_values ADD CONSTRAINT "task_custom_field_values_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_label_assignments ADD CONSTRAINT "task_label_assignments_label_code_fkey" FOREIGN KEY (label_code) REFERENCES task_labels(code) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_label_assignments ADD CONSTRAINT "task_label_assignments_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_notes ADD CONSTRAINT "task_notes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.task_notes ADD CONSTRAINT "task_notes_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_steps ADD CONSTRAINT "task_steps_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES users_profile(id);
ALTER TABLE ONLY public.task_steps ADD CONSTRAINT "task_steps_source_sop_step_id_fkey" FOREIGN KEY (source_sop_step_id) REFERENCES sub_service_sop_steps(id);
ALTER TABLE ONLY public.task_steps ADD CONSTRAINT "task_steps_source_template_step_id_fkey" FOREIGN KEY (source_template_step_id) REFERENCES task_template_steps(id);
ALTER TABLE ONLY public.task_steps ADD CONSTRAINT "task_steps_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_template_steps ADD CONSTRAINT "task_template_steps_task_template_id_fkey" FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_templates ADD CONSTRAINT "task_templates_default_assignee_id_fkey" FOREIGN KEY (default_assignee_id) REFERENCES users_profile(id);
ALTER TABLE ONLY public.task_templates ADD CONSTRAINT "task_templates_default_reviewer_id_fkey" FOREIGN KEY (default_reviewer_id) REFERENCES users_profile(id);
ALTER TABLE ONLY public.task_templates ADD CONSTRAINT "task_templates_sub_service_id_fkey" FOREIGN KEY (sub_service_id) REFERENCES sub_services(id);
ALTER TABLE ONLY public.task_workdone ADD CONSTRAINT "task_workdone_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_workdone ADD CONSTRAINT "task_workdone_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.task_workdone ADD CONSTRAINT "task_workdone_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users_profile(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users_profile(id);
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_billing_entity_fk" FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id);
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES users_profile(id);
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_service_head_id_fkey" FOREIGN KEY (service_head_id) REFERENCES users_profile(id);
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_sub_service_id_fkey" FOREIGN KEY (sub_service_id) REFERENCES sub_services(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_task_template_id_fkey" FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.tasks ADD CONSTRAINT "tasks_verified_by_user_id_fkey" FOREIGN KEY (verified_by_user_id) REFERENCES users_profile(id);
ALTER TABLE ONLY public.team_client_assignment ADD CONSTRAINT "team_client_assignment_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.team_client_assignment ADD CONSTRAINT "team_client_assignment_team_user_id_fkey" FOREIGN KEY (team_user_id) REFERENCES users_profile(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_billing_entity_access ADD CONSTRAINT "user_billing_entity_access_billing_entity_id_fkey" FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_billing_entity_access ADD CONSTRAINT "user_billing_entity_access_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users_profile(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.users_profile ADD CONSTRAINT "users_profile_active_role_template_id_fkey" FOREIGN KEY (active_role_template_id) REFERENCES staff_role_templates(id);
ALTER TABLE ONLY public.users_profile ADD CONSTRAINT "users_profile_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.users_profile ADD CONSTRAINT "users_profile_manager_id_fkey" FOREIGN KEY (manager_id) REFERENCES users_profile(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.users_profile ADD CONSTRAINT "users_profile_reports_to_fkey" FOREIGN KEY (reports_to) REFERENCES users_profile(id);
ALTER TABLE ONLY public.weekly_timesheet_submissions ADD CONSTRAINT "weekly_timesheet_submissions_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users_profile(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.weekly_timesheet_submissions ADD CONSTRAINT "weekly_timesheet_submissions_manager_id_fkey" FOREIGN KEY (manager_id) REFERENCES users_profile(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.weekly_timesheet_submissions ADD CONSTRAINT "weekly_timesheet_submissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users_profile(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_attendance_logs_date ON public.attendance_logs USING btree (attendance_date);
CREATE INDEX idx_attendance_logs_overridden_by ON public.attendance_logs USING btree (overridden_by);
CREATE INDEX idx_attendance_logs_user ON public.attendance_logs USING btree (user_id);
CREATE INDEX idx_billing_entities_default_profit_centre_code ON public.billing_entities USING btree (default_profit_centre_code);
CREATE UNIQUE INDEX idx_client_groups_name_active ON public.client_groups USING btree (name) WHERE (is_deleted = false);
CREATE INDEX idx_client_import_batches_uploaded_by ON public.client_import_batches USING btree (uploaded_by);
CREATE INDEX idx_client_services_client ON public.client_services USING btree (client_id);
CREATE INDEX idx_client_services_is_active ON public.client_services USING btree (is_active);
CREATE INDEX idx_client_services_service ON public.client_services USING btree (service_id);
CREATE INDEX idx_client_services_service_head ON public.client_services USING btree (service_head_id);
CREATE INDEX idx_client_sub_services_client ON public.client_sub_services USING btree (client_id);
CREATE INDEX idx_client_sub_services_sub_service ON public.client_sub_services USING btree (sub_service_id);
CREATE INDEX idx_clients_business_name ON public.clients USING btree (business_name text_pattern_ops);
CREATE INDEX idx_clients_default_billing_entity_id ON public.clients USING btree (default_billing_entity_id);
CREATE INDEX idx_clients_default_cost_centre_code ON public.clients USING btree (default_cost_centre_code);
CREATE INDEX idx_clients_default_profit_centre_code ON public.clients USING btree (default_profit_centre_code);
CREATE INDEX idx_clients_group_city ON public.clients USING btree (group_id, city) WHERE (is_deleted = false);
CREATE INDEX idx_clients_group_id ON public.clients USING btree (group_id);
CREATE INDEX idx_clients_gstin ON public.clients USING btree (gstin);
CREATE INDEX idx_clients_lifecycle_stage ON public.clients USING btree (lifecycle_stage);
CREATE INDEX idx_clients_pan ON public.clients USING btree (pan);
CREATE UNIQUE INDEX idx_clients_pan_active ON public.clients USING btree (pan) WHERE (is_deleted = false);
CREATE INDEX idx_clients_primary_owner_id ON public.clients USING btree (primary_owner_id);
CREATE INDEX idx_clients_search_trgm ON public.clients USING gin (business_name gin_trgm_ops, pan gin_trgm_ops) WHERE (is_deleted = false);
CREATE INDEX idx_cce_client_due ON public.compliance_calendar_events USING btree (client_id, due_date);
CREATE INDEX idx_cce_rule_id ON public.compliance_calendar_events USING btree (rule_id);
CREATE UNIQUE INDEX idx_cce_service_period_unique ON public.compliance_calendar_events USING btree (client_id, sub_service_id, period_label) WHERE (sub_service_id IS NOT NULL);
CREATE INDEX idx_cce_status ON public.compliance_calendar_events USING btree (status);
CREATE INDEX idx_cce_sub_service ON public.compliance_calendar_events USING btree (sub_service_id);
CREATE INDEX idx_compliance_calendar_events_deleted_by ON public.compliance_calendar_events USING btree (deleted_by);
CREATE INDEX idx_compliance_calendar_events_is_deleted ON public.compliance_calendar_events USING btree (is_deleted);
CREATE INDEX idx_compliance_events_due_date ON public.compliance_calendar_events USING btree (due_date, status) WHERE (is_deleted = false);
CREATE INDEX idx_compliance_events_rule_period ON public.compliance_calendar_events USING btree (rule_code, period_label, task_id);
CREATE INDEX idx_compliance_events_unified_inbox ON public.compliance_calendar_events USING btree (task_id, due_date) WHERE (task_id IS NULL);
CREATE INDEX idx_ccr_active ON public.compliance_calendar_rules USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_ccr_kind ON public.compliance_calendar_rules USING btree (service_kind);
CREATE INDEX idx_ccr_sub_service ON public.compliance_calendar_rules USING btree (sub_service_id);
CREATE INDEX idx_compliance_status_client ON public.compliance_status USING btree (client_id);
CREATE INDEX idx_compliance_status_is_overdue ON public.compliance_status USING btree (is_overdue);
CREATE INDEX idx_credentials_client ON public.credentials USING btree (client_id);
CREATE INDEX idx_credentials_is_deleted ON public.credentials USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_dsc_records_client ON public.dsc_records USING btree (client_id);
CREATE INDEX idx_dsc_records_created_by ON public.dsc_records USING btree (created_by);
CREATE INDEX idx_dsc_records_expiry_date ON public.dsc_records USING btree (expiry_date);
CREATE INDEX idx_dsc_records_expiry_status ON public.dsc_records USING btree (expiry_date, status) WHERE (is_deleted = false);
CREATE UNIQUE INDEX idx_dsc_records_serial_active ON public.dsc_records USING btree (certificate_serial) WHERE (is_deleted = false);
CREATE INDEX idx_dsc_records_status ON public.dsc_records USING btree (status) WHERE (status = 'active'::text);
CREATE INDEX idx_dsc_records_updated_by ON public.dsc_records USING btree (updated_by);
CREATE INDEX idx_audit_log_entity ON public.global_audit_log USING btree (entity_type, entity_id, performed_at DESC);
CREATE INDEX idx_global_audit_log_actor_action ON public.global_audit_log USING btree (performed_by, action, performed_at DESC);
CREATE INDEX idx_global_audit_log_performed_at ON public.global_audit_log USING btree (performed_at);
CREATE INDEX idx_global_audit_log_performed_by ON public.global_audit_log USING btree (performed_by);
CREATE INDEX idx_leave_requests_reviewed_by ON public.leave_requests USING btree (reviewed_by);
CREATE INDEX idx_leave_requests_user ON public.leave_requests USING btree (user_id);
CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);
CREATE INDEX idx_permission_requests_reviewed_by ON public.permission_requests USING btree (reviewed_by);
CREATE INDEX idx_permission_requests_status ON public.permission_requests USING btree (status);
CREATE INDEX idx_permission_requests_user ON public.permission_requests USING btree (user_id);
CREATE INDEX idx_rate_limit_counters_window ON public.rate_limit_counters USING btree (window_start);
CREATE UNIQUE INDEX idx_service_categories_name_active ON public.service_categories USING btree (name) WHERE (is_deleted = false);
CREATE INDEX idx_services_category ON public.services USING btree (category_id);
CREATE UNIQUE INDEX idx_services_code_active ON public.services USING btree (code) WHERE (is_deleted = false);
CREATE INDEX idx_services_service_kind ON public.services USING btree (service_kind) WHERE (service_kind IS NOT NULL);
CREATE INDEX idx_staff_capabilities_capability ON public.staff_capabilities USING btree (capability) WHERE (revoked_at IS NULL);
CREATE INDEX idx_staff_capabilities_granted_by ON public.staff_capabilities USING btree (granted_by);
CREATE INDEX idx_staff_capabilities_revoked_by ON public.staff_capabilities USING btree (revoked_by);
CREATE INDEX idx_staff_capabilities_user ON public.staff_capabilities USING btree (user_id) WHERE (revoked_at IS NULL);
CREATE INDEX idx_staff_capabilities_user_cap ON public.staff_capabilities USING btree (user_id, capability) WHERE (revoked_at IS NULL);
CREATE INDEX idx_role_template_capabilities_template_cap ON public.staff_role_template_capabilities USING btree (template_id, capability);
CREATE INDEX idx_role_template_caps_template ON public.staff_role_template_capabilities USING btree (template_id);
CREATE INDEX idx_staff_role_templates_created_by ON public.staff_role_templates USING btree (created_by);
CREATE UNIQUE INDEX idx_staff_role_templates_name_active ON public.staff_role_templates USING btree (name) WHERE (is_deleted = false);
CREATE INDEX idx_sop_steps_sub_service ON public.sub_service_sop_steps USING btree (sub_service_id) WHERE (is_deleted = false);
CREATE UNIQUE INDEX idx_sop_steps_unique_active_order ON public.sub_service_sop_steps USING btree (sub_service_id, step_order) WHERE (is_deleted = false);
CREATE INDEX idx_sub_services_code ON public.sub_services USING btree (code);
CREATE INDEX idx_sub_services_name_trgm ON public.sub_services USING gin (name gin_trgm_ops);
CREATE INDEX idx_sub_services_service ON public.sub_services USING btree (service_id);
CREATE INDEX idx_task_activity_changed_by ON public.task_activity USING btree (changed_by);
CREATE INDEX idx_task_activity_task ON public.task_activity USING btree (task_id);
CREATE INDEX idx_task_activity_task_created ON public.task_activity USING btree (task_id, created_at DESC);
CREATE INDEX idx_task_assignees_assigned_by ON public.task_assignees USING btree (assigned_by);
CREATE INDEX idx_task_assignees_task ON public.task_assignees USING btree (task_id);
CREATE INDEX idx_task_assignees_user ON public.task_assignees USING btree (user_id);
CREATE UNIQUE INDEX uq_tcfd_subsvc_key ON public.task_custom_field_definitions USING btree (sub_service_id, field_key) WHERE (sub_service_id IS NOT NULL);
CREATE UNIQUE INDEX uq_tcfd_svc_key ON public.task_custom_field_definitions USING btree (service_id, field_key) WHERE ((service_id IS NOT NULL) AND (sub_service_id IS NULL));
CREATE INDEX idx_task_custom_field_values_definition_id ON public.task_custom_field_values USING btree (definition_id);
CREATE INDEX idx_tcfv_task ON public.task_custom_field_values USING btree (task_id);
CREATE INDEX idx_task_label_assignments_label ON public.task_label_assignments USING btree (label_code);
CREATE INDEX idx_task_label_assignments_label_task ON public.task_label_assignments USING btree (label_code, task_id);
CREATE INDEX idx_task_label_assignments_task ON public.task_label_assignments USING btree (task_id);
CREATE INDEX idx_task_notes_created_by ON public.task_notes USING btree (created_by);
CREATE INDEX idx_task_notes_task ON public.task_notes USING btree (task_id);
CREATE INDEX idx_task_notes_task_created ON public.task_notes USING btree (task_id, created_at DESC);
CREATE INDEX idx_task_steps_completed_by ON public.task_steps USING btree (completed_by) WHERE (completed_at IS NOT NULL);
CREATE INDEX idx_task_steps_source_sop_step_id ON public.task_steps USING btree (source_sop_step_id);
CREATE INDEX idx_task_steps_source_template ON public.task_steps USING btree (source_template_step_id);
CREATE INDEX idx_task_steps_task ON public.task_steps USING btree (task_id);
CREATE INDEX idx_task_steps_task_order ON public.task_steps USING btree (task_id, step_order);
CREATE INDEX idx_task_template_steps_template ON public.task_template_steps USING btree (task_template_id) WHERE (is_deleted = false);
CREATE UNIQUE INDEX idx_task_template_steps_unique_active_order ON public.task_template_steps USING btree (task_template_id, step_order) WHERE (is_deleted = false);
CREATE INDEX idx_task_templates_default_assignee_id ON public.task_templates USING btree (default_assignee_id);
CREATE INDEX idx_task_templates_default_reviewer_id ON public.task_templates USING btree (default_reviewer_id);
CREATE INDEX idx_task_templates_sub_service ON public.task_templates USING btree (sub_service_id);
CREATE INDEX idx_task_workdone_client_date ON public.task_workdone USING btree (client_id, work_date);
CREATE INDEX idx_task_workdone_task_id ON public.task_workdone USING btree (task_id, work_date DESC);
CREATE INDEX idx_task_workdone_work_date ON public.task_workdone USING btree (work_date DESC);
CREATE INDEX idx_workdone_client ON public.task_workdone USING btree (client_id);
CREATE INDEX idx_workdone_task ON public.task_workdone USING btree (task_id);
CREATE INDEX idx_workdone_user_d ON public.task_workdone USING btree (user_id, work_date);
CREATE INDEX idx_tasks_assigned_status_due ON public.tasks USING btree (assigned_to, status, due_date) WHERE (is_deleted = false);
CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);
CREATE INDEX idx_tasks_assignee_status ON public.tasks USING btree (assigned_to, status) WHERE (is_deleted = false);
CREATE INDEX idx_tasks_attention ON public.tasks USING btree (status, is_stuck) WHERE (is_deleted = false);
CREATE INDEX idx_tasks_billable_verified ON public.tasks USING btree (is_billable, is_verified, status) WHERE (is_deleted = false);
CREATE INDEX idx_tasks_billing_entity ON public.tasks USING btree (billing_entity_id);
CREATE INDEX idx_tasks_blocked_client ON public.tasks USING btree (is_blocked_on_client) WHERE (is_blocked_on_client = true);
CREATE INDEX idx_tasks_client ON public.tasks USING btree (client_id);
CREATE INDEX idx_tasks_client_status ON public.tasks USING btree (client_id, status) WHERE (is_deleted = false);
CREATE INDEX idx_tasks_client_subservice_status ON public.tasks USING btree (client_id, sub_service_id, status) WHERE (is_deleted = false);
CREATE INDEX idx_tasks_created_at ON public.tasks USING btree (created_at);
CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);
CREATE INDEX idx_tasks_due_status ON public.tasks USING btree (due_date, status) WHERE ((is_deleted = false) AND (status <> 'completed'::text));
CREATE INDEX idx_tasks_is_billable ON public.tasks USING btree (is_billable) WHERE (is_billable = true);
CREATE INDEX idx_tasks_is_stuck ON public.tasks USING btree (is_stuck) WHERE (is_stuck = true);
CREATE INDEX idx_tasks_period_status ON public.tasks USING btree (period_year, period_month, status) WHERE (is_deleted = false);
CREATE INDEX idx_tasks_profit_centre ON public.tasks USING btree (profit_centre_code);
CREATE INDEX idx_tasks_reviewer ON public.tasks USING btree (reviewer_id);
CREATE INDEX idx_tasks_service_head ON public.tasks USING btree (service_head_id);
CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);
CREATE INDEX idx_tasks_status_updated ON public.tasks USING btree (status, updated_at DESC) WHERE (is_deleted = false);
CREATE INDEX idx_tasks_stuck_priority_status ON public.tasks USING btree (is_stuck, priority, status) WHERE (is_deleted = false);
CREATE INDEX idx_tasks_sub_service_id ON public.tasks USING btree (sub_service_id);
CREATE INDEX idx_tasks_subservice ON public.tasks USING btree (sub_service_id) WHERE (is_deleted = false);
CREATE INDEX idx_tasks_task_number ON public.tasks USING btree (task_number text_pattern_ops);
CREATE UNIQUE INDEX idx_tasks_task_number_active ON public.tasks USING btree (task_number) WHERE (is_deleted = false);
CREATE INDEX idx_tasks_task_number_trgm ON public.tasks USING gin (task_number gin_trgm_ops);
CREATE INDEX idx_tasks_task_template_id ON public.tasks USING btree (task_template_id);
CREATE INDEX idx_tasks_title ON public.tasks USING btree (title text_pattern_ops);
CREATE INDEX idx_tasks_title_trgm ON public.tasks USING gin (title gin_trgm_ops);
CREATE INDEX idx_tasks_unified_inbox ON public.tasks USING btree (status, is_deleted, due_date) WHERE ((is_deleted = false) AND (status = ANY (ARRAY['pending'::text, 'in_progress'::text])));
CREATE INDEX idx_tasks_verification ON public.tasks USING btree (verification_status) WHERE (verification_status = 'pending'::text);
CREATE INDEX idx_tasks_verified_by_user_id ON public.tasks USING btree (verified_by_user_id);
CREATE UNIQUE INDEX uniq_active_task_per_period ON public.tasks USING btree (client_id, sub_service_id, period_month, period_year) WHERE ((is_deleted = false) AND (period_month IS NOT NULL) AND (period_year IS NOT NULL));
CREATE INDEX idx_team_client_assignment_client ON public.team_client_assignment USING btree (client_id);
CREATE INDEX idx_team_client_assignment_team ON public.team_client_assignment USING btree (team_user_id);
CREATE UNIQUE INDEX idx_team_client_assignment_unique_active ON public.team_client_assignment USING btree (team_user_id, client_id, COALESCE(assigned_from, '1900-01-01'::date)) WHERE (assigned_to IS NULL);
CREATE INDEX idx_team_client_assignment_user_client ON public.team_client_assignment USING btree (team_user_id, client_id);
CREATE INDEX idx_user_billing_entity_access_billing_entity_id ON public.user_billing_entity_access USING btree (billing_entity_id);
CREATE INDEX idx_users_profile_active_role_template_id ON public.users_profile USING btree (active_role_template_id);
CREATE INDEX idx_users_profile_is_active ON public.users_profile USING btree (is_active);
CREATE INDEX idx_users_profile_manager_id ON public.users_profile USING btree (manager_id) WHERE (is_active = true);
CREATE UNIQUE INDEX idx_users_profile_one_prime_admin ON public.users_profile USING btree (is_prime_admin) WHERE (is_prime_admin = true);
CREATE INDEX idx_users_profile_prime_admin ON public.users_profile USING btree (is_prime_admin) WHERE (is_prime_admin = true);
CREATE INDEX idx_users_profile_reports_to ON public.users_profile USING btree (reports_to);
CREATE INDEX idx_users_profile_role ON public.users_profile USING btree (role);
CREATE INDEX idx_users_profile_role_active ON public.users_profile USING btree (role, is_active, is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_weekly_timesheet_submissions_approved_by ON public.weekly_timesheet_submissions USING btree (approved_by);
CREATE INDEX idx_weekly_ts_manager_id ON public.weekly_timesheet_submissions USING btree (manager_id);
CREATE INDEX idx_weekly_ts_status ON public.weekly_timesheet_submissions USING btree (status);
CREATE INDEX idx_weekly_ts_user_id ON public.weekly_timesheet_submissions USING btree (user_id);
CREATE INDEX idx_weekly_ts_week_start ON public.weekly_timesheet_submissions USING btree (week_start);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
 RETURNS TABLE(allowed boolean, remaining integer, reset_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_window timestamptz;
  v_hits   integer;
BEGIN
  -- Fixed window aligned to the window length.
  v_window := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.rate_limit_counters AS c (key, window_start, hits)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = c.hits + 1
  RETURNING c.hits INTO v_hits;

  -- Occasional cleanup of old windows (about 1% of calls).
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_counters WHERE window_start < now() - interval '1 day';
  END IF;

  allowed   := v_hits <= p_max;
  remaining := greatest(p_max - v_hits, 0);
  reset_at  := v_window + make_interval(secs => p_window_seconds);
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.count_tasks_by_status(p_assigned_to uuid DEFAULT NULL::uuid, p_client_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(status text, count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT t.status, COUNT(*)::bigint
  FROM tasks t
  WHERE t.is_deleted = false
    AND (p_assigned_to IS NULL OR t.assigned_to = p_assigned_to)
    AND (p_client_id IS NULL OR t.client_id = p_client_id)
    AND t.status IN ('pending', 'in_progress', 'completed', 'cancelled')
  GROUP BY t.status;
$function$;

CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.users_profile WHERE id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.get_task_closure_velocity(p_days integer DEFAULT 30)
 RETURNS TABLE(date text, count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    ((t.updated_at AT TIME ZONE 'Asia/Kolkata')::date)::text AS date,
    COUNT(*)::bigint AS count
  FROM tasks t
  WHERE t.status = 'completed'
    AND t.updated_at >= (NOW() - (p_days || ' days')::interval)
  GROUP BY date
  ORDER BY date;
$function$;

CREATE OR REPLACE FUNCTION public.guard_users_profile_privileged_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_role text;
  v_is_self boolean;
BEGIN
  -- Service role, migrations and the SQL editor have no JWT user: allow.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_caller_role := public.current_user_role();

  IF TG_OP = 'INSERT' THEN
    -- Profiles are created by admins through the service-role client.
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only admins can create user profiles' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- Admins keep full control.
  IF v_caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Nobody below admin may ever change these.
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_prime_admin IS DISTINCT FROM OLD.is_prime_admin
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Only an admin can change role or admin status' USING ERRCODE = '42501';
  END IF;

  v_is_self := (OLD.id = auth.uid());

  -- On their own row, non-admins may edit only harmless contact fields.
  IF v_is_self AND (
       NEW.is_active IS DISTINCT FROM OLD.is_active
    OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
    OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
    OR NEW.active_role_template_id IS DISTINCT FROM OLD.active_role_template_id
    OR NEW.reports_to IS DISTINCT FROM OLD.reports_to
    OR NEW.manager_id IS DISTINCT FROM OLD.manager_id
    OR NEW.monthly_salary IS DISTINCT FROM OLD.monthly_salary
    OR NEW.paid_leaves_per_month IS DISTINCT FROM OLD.paid_leaves_per_month
    OR NEW.geo_check_in_required IS DISTINCT FROM OLD.geo_check_in_required
  ) THEN
    RAISE EXCEPTION 'You cannot change this field on your own profile' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_workdone_summary(p_from date, p_to date)
 RETURNS TABLE(user_id uuid, user_name text, client_id uuid, client_name text, total_minutes bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    tw.user_id,
    up.full_name AS user_name,
    tw.client_id,
    c.business_name AS client_name,
    SUM(tw.duration_minutes)::bigint AS total_minutes
  FROM task_workdone tw
  LEFT JOIN users_profile up ON up.id = tw.user_id
  LEFT JOIN clients c ON c.id = tw.client_id
  WHERE tw.work_date >= p_from AND tw.work_date <= p_to
  GROUP BY tw.user_id, up.full_name, tw.client_id, c.business_name
  ORDER BY total_minutes DESC;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_capability(cap text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_template_id UUID;
BEGIN
  IF to_regclass('public.staff_capabilities') IS NULL THEN
    RETURN FALSE;
  END IF;

  v_user_id := auth.uid();

  -- 1. Explicit deviation (grant or revoke)
  IF EXISTS (
    SELECT 1 FROM staff_capabilities
    WHERE user_id = v_user_id
      AND capability = cap
      AND revoked_at IS NULL
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM staff_capabilities
    WHERE user_id = v_user_id
      AND capability = cap
      AND revoked_at IS NOT NULL
  ) THEN
    RETURN FALSE;
  END IF;

  -- 2. Fallback to active role template
  SELECT active_role_template_id INTO v_template_id
  FROM users_profile
  WHERE id = v_user_id;

  IF v_template_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM staff_role_template_capabilities
      WHERE template_id = v_template_id
        AND capability = cap
    );
  END IF;

  RETURN FALSE;
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

-- Function privileges (only functions whose access was changed from the default)
REVOKE ALL ON FUNCTION check_rate_limit(text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_rate_limit(text,integer,integer) TO postgres;
GRANT EXECUTE ON FUNCTION check_rate_limit(text,integer,integer) TO service_role;
REVOKE ALL ON FUNCTION current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_user_role() TO postgres;
GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION current_user_role() TO PUBLIC;
REVOKE ALL ON FUNCTION user_has_capability(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION user_has_capability(text) TO postgres;
GRANT EXECUTE ON FUNCTION user_has_capability(text) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_capability(text) TO service_role;
GRANT EXECUTE ON FUNCTION user_has_capability(text) TO PUBLIC;

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
CREATE VIEW public."v_unified_inbox" WITH (security_invoker=true) AS
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
    jsonb_build_object('task_number', t.task_number, 'is_stuck', t.is_stuck, 'is_blocked_on_client', t.is_blocked_on_client) AS meta
   FROM tasks t
     LEFT JOIN clients c ON c.id = t.client_id
  WHERE t.is_deleted = false AND (t.status = ANY (ARRAY['pending'::text, 'in_progress'::text]))
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
    jsonb_build_object('rule_code', r.rule_code, 'service_kind', r.service_kind, 'period_label', e.period_label) AS meta
   FROM compliance_calendar_events e
     LEFT JOIN compliance_calendar_rules r ON r.id = e.rule_id
     LEFT JOIN clients c ON c.id = e.client_id
  WHERE e.task_id IS NULL AND e.is_deleted = false;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_guard_users_profile BEFORE INSERT OR UPDATE ON public.users_profile FOR EACH ROW EXECUTE FUNCTION guard_users_profile_privileged_columns();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
ALTER TABLE public."attendance_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."billing_entities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."client_compliance_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."client_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."client_import_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."client_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."client_sub_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."compliance_calendar_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."compliance_calendar_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."compliance_status" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."cost_centres" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."dsc_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."global_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."leave_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."permission_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."profit_centres" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."rate_limit_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."service_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."staff_capabilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."staff_role_template_capabilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."staff_role_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sub_service_sop_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sub_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."task_activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."task_assignees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."task_custom_field_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."task_custom_field_values" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."task_label_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."task_labels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."task_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."task_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."task_template_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."task_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."task_workdone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."team_client_assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_billing_entity_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."weekly_timesheet_submissions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_admin_insert" ON public."attendance_logs" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT users_profile.role
   FROM users_profile
  WHERE (users_profile.id = ( SELECT auth.uid() AS uid))) = 'admin'::text));

CREATE POLICY "attendance_admin_update" ON public."attendance_logs" AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT users_profile.role
   FROM users_profile
  WHERE (users_profile.id = ( SELECT auth.uid() AS uid))) = 'admin'::text))
  WITH CHECK ((( SELECT users_profile.role
   FROM users_profile
  WHERE (users_profile.id = ( SELECT auth.uid() AS uid))) = 'admin'::text));

CREATE POLICY "attendance_direct_reports" ON public."attendance_logs" AS PERMISSIVE FOR SELECT TO public
  USING ((( SELECT users_profile.reports_to
   FROM users_profile
  WHERE (users_profile.id = attendance_logs.user_id)) = ( SELECT auth.uid() AS uid)));

CREATE POLICY "attendance_logs_team_approve" ON public."attendance_logs" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('attendance.approve'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('attendance.approve'::text) AS user_has_capability)));

CREATE POLICY "attendance_logs_team_view_all" ON public."attendance_logs" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('attendance.view_all'::text) AS user_has_capability)));

CREATE POLICY "attendance_manager_insert" ON public."attendance_logs" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT users_profile.reports_to
   FROM users_profile
  WHERE (users_profile.id = attendance_logs.user_id)) = ( SELECT auth.uid() AS uid)));

CREATE POLICY "attendance_manager_update" ON public."attendance_logs" AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT users_profile.reports_to
   FROM users_profile
  WHERE (users_profile.id = attendance_logs.user_id)) = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((( SELECT users_profile.reports_to
   FROM users_profile
  WHERE (users_profile.id = attendance_logs.user_id)) = ( SELECT auth.uid() AS uid)));

CREATE POLICY "attendance_own_insert" ON public."attendance_logs" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "attendance_own_update" ON public."attendance_logs" AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "attendance_own_view" ON public."attendance_logs" AS PERMISSIVE FOR SELECT TO public
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR (( SELECT users_profile.role
   FROM users_profile
  WHERE (users_profile.id = ( SELECT auth.uid() AS uid))) = ANY (ARRAY['admin'::text, 'team'::text]))));

CREATE POLICY "be_admin" ON public."billing_entities" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "be_read" ON public."billing_entities" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (id IN ( SELECT user_billing_entity_access.billing_entity_id
   FROM user_billing_entity_access
  WHERE (user_billing_entity_access.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "billing_entities_team_manage" ON public."billing_entities" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_billing_entities'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_billing_entities'::text) AS user_has_capability)));

CREATE POLICY "ccp_admin" ON public."client_compliance_profiles" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])));

CREATE POLICY "ccp_admin_mutate" ON public."client_compliance_profiles" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "ccp_admin_select" ON public."client_compliance_profiles" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "ccp_team_read" ON public."client_compliance_profiles" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "client_groups_admin" ON public."client_groups" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "client_groups_admin_mutate" ON public."client_groups" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "client_groups_admin_select" ON public."client_groups" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])));

CREATE POLICY "import_batches_admin" ON public."client_import_batches" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "client_services_admin_mutate" ON public."client_services" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "client_services_admin_select" ON public."client_services" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])));

CREATE POLICY "client_services_admin_team" ON public."client_services" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "client_services_team_write" ON public."client_services" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('services.assign'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('services.assign'::text) AS user_has_capability)));

CREATE POLICY "client_sub_services_admin_mutate" ON public."client_sub_services" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "client_sub_services_admin_select" ON public."client_sub_services" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])));

CREATE POLICY "client_sub_services_admin_team" ON public."client_sub_services" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "client_sub_services_team_write" ON public."client_sub_services" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('services.assign'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('services.assign'::text) AS user_has_capability)));

CREATE POLICY "clients_admin_all" ON public."clients" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "clients_team_delete" ON public."clients" AS PERMISSIVE FOR DELETE TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('clients.delete'::text) AS user_has_capability)));

CREATE POLICY "clients_team_insert" ON public."clients" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('clients.create'::text) AS user_has_capability)));

CREATE POLICY "clients_team_select" ON public."clients" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('clients.read.all'::text) AS user_has_capability))));

CREATE POLICY "clients_team_update" ON public."clients" AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('clients.edit'::text) AS user_has_capability))));

CREATE POLICY "cce_admin" ON public."compliance_calendar_events" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])));

CREATE POLICY "cce_admin_mutate" ON public."compliance_calendar_events" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "cce_admin_select" ON public."compliance_calendar_events" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "cce_team" ON public."compliance_calendar_events" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "ccr_admin" ON public."compliance_calendar_rules" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "ccr_read" ON public."compliance_calendar_rules" AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "compliance_calendar_rules_team_manage" ON public."compliance_calendar_rules" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_compliance_rules'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_compliance_rules'::text) AS user_has_capability)));

CREATE POLICY "compliance_status_admin" ON public."compliance_status" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "compliance_status_team_select" ON public."compliance_status" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('compliance.view'::text) AS user_has_capability) OR ( SELECT user_has_capability('compliance.enter'::text) AS user_has_capability))));

CREATE POLICY "compliance_status_team_update" ON public."compliance_status" AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('compliance.enter'::text) AS user_has_capability))))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('compliance.enter'::text) AS user_has_capability))));

CREATE POLICY "cc_admin" ON public."cost_centres" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "cc_read" ON public."cost_centres" AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "cost_centres_team_manage" ON public."cost_centres" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_billing_entities'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_billing_entities'::text) AS user_has_capability)));

CREATE POLICY "credentials_admin_all" ON public."credentials" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "credentials_admin_select" ON public."credentials" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "credentials_team_insert" ON public."credentials" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('credentials.manage'::text) AS user_has_capability))));

CREATE POLICY "credentials_team_select" ON public."credentials" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('credentials.manage'::text) AS user_has_capability))));

CREATE POLICY "credentials_team_update" ON public."credentials" AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('credentials.manage'::text) AS user_has_capability))))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('credentials.manage'::text) AS user_has_capability))));

CREATE POLICY "credentials_team_view_select" ON public."credentials" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('credentials.view'::text) AS user_has_capability)));

CREATE POLICY "dsc_records_admin_all" ON public."dsc_records" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "dsc_records_admin_select" ON public."dsc_records" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "dsc_records_team_insert" ON public."dsc_records" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('dsc.manage'::text) AS user_has_capability))));

CREATE POLICY "dsc_records_team_select" ON public."dsc_records" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('dsc.manage'::text) AS user_has_capability))));

CREATE POLICY "dsc_records_team_update" ON public."dsc_records" AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('dsc.manage'::text) AS user_has_capability))))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('dsc.manage'::text) AS user_has_capability))));

CREATE POLICY "dsc_records_team_view_select" ON public."dsc_records" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('dsc.view'::text) AS user_has_capability)));

CREATE POLICY "audit_admin_select" ON public."global_audit_log" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "audit_auth_insert" ON public."global_audit_log" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((performed_by = ( SELECT auth.uid() AS uid)));

CREATE POLICY "audit_log_team_view" ON public."global_audit_log" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('audit.view'::text) AS user_has_capability)));

CREATE POLICY "leave_requests_team_approve" ON public."leave_requests" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('leave.approve'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('leave.approve'::text) AS user_has_capability)));

CREATE POLICY "leave_self_insert" ON public."leave_requests" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "leave_self_select" ON public."leave_requests" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR (( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text]))));

CREATE POLICY "leave_self_update" ON public."leave_requests" AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR (( SELECT current_user_role() AS current_user_role) = 'admin'::text)))
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR (( SELECT current_user_role() AS current_user_role) = 'admin'::text)));

CREATE POLICY "notif_prefs_admin" ON public."notification_preferences" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "notif_prefs_self" ON public."notification_preferences" AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "notif_self_delete" ON public."notifications" AS PERMISSIVE FOR DELETE TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "notif_self_insert" ON public."notifications" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "notif_self_select" ON public."notifications" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "notif_self_update" ON public."notifications" AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "notif_staff_insert" ON public."notifications" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])));

CREATE POLICY "notif_staff_update" ON public."notifications" AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])));

CREATE POLICY "permission_admin_all" ON public."permission_requests" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "permission_requests_team_approve" ON public."permission_requests" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('permission.approve'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('permission.approve'::text) AS user_has_capability)));

CREATE POLICY "permission_user_own" ON public."permission_requests" AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "pc_admin" ON public."profit_centres" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "pc_read" ON public."profit_centres" AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profit_centres_team_manage" ON public."profit_centres" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_billing_entities'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_billing_entities'::text) AS user_has_capability)));

CREATE POLICY "catalogue_admin" ON public."service_categories" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "catalogue_read" ON public."service_categories" AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "services_admin" ON public."services" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "services_read" ON public."services" AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "services_team_mutate" ON public."services" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('services.manage'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('services.manage'::text) AS user_has_capability)));

CREATE POLICY "services_team_view_select" ON public."services" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('services.view'::text) AS user_has_capability)));

CREATE POLICY "staff_caps_admin_all" ON public."staff_capabilities" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "staff_caps_self_view" ON public."staff_capabilities" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "staff_caps_team_grant" ON public."staff_capabilities" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('staff.grant_capabilities'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('staff.grant_capabilities'::text) AS user_has_capability)));

CREATE POLICY "role_template_caps_admin" ON public."staff_role_template_capabilities" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "role_template_caps_read_all" ON public."staff_role_template_capabilities" AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "role_templates_admin" ON public."staff_role_templates" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "role_templates_team_read" ON public."staff_role_templates" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])));

CREATE POLICY "sop_admin" ON public."sub_service_sop_steps" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "sop_team_read" ON public."sub_service_sop_steps" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['team'::text, 'admin'::text])));

CREATE POLICY "sub_services_admin" ON public."sub_services" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "sub_services_read" ON public."sub_services" AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "sub_services_team_mutate" ON public."sub_services" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('services.manage'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('services.manage'::text) AS user_has_capability)));

CREATE POLICY "sub_services_team_view_select" ON public."sub_services" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('services.view'::text) AS user_has_capability)));

CREATE POLICY "task_activity_insert" ON public."task_activity" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM tasks)));

CREATE POLICY "task_activity_visible" ON public."task_activity" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((task_id IN ( SELECT tasks.id
   FROM tasks)));

CREATE POLICY "task_assignees_admin_all" ON public."task_assignees" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "task_assignees_team_manage" ON public."task_assignees" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('tasks.assign'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('tasks.assign'::text) AS user_has_capability)));

CREATE POLICY "task_assignees_team_read" ON public."task_assignees" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND (( SELECT user_has_capability('tasks.view'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.edit'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.assign'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.complete'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.create'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.delete'::text) AS user_has_capability) OR (user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "task_custom_field_definitions_team_manage" ON public."task_custom_field_definitions" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_custom_fields'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_custom_fields'::text) AS user_has_capability)));

CREATE POLICY "tcfd_admin" ON public."task_custom_field_definitions" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "tcfd_read" ON public."task_custom_field_definitions" AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "tcfv_team" ON public."task_custom_field_values" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "tcfv_team_delete" ON public."task_custom_field_values" AS PERMISSIVE FOR DELETE TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "tcfv_team_insert" ON public."task_custom_field_values" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "tcfv_team_select" ON public."task_custom_field_values" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "tcfv_team_update" ON public."task_custom_field_values" AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "tla_team" ON public."task_label_assignments" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "tla_team_delete" ON public."task_label_assignments" AS PERMISSIVE FOR DELETE TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "tla_team_insert" ON public."task_label_assignments" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "tla_team_select" ON public."task_label_assignments" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "tla_team_update" ON public."task_label_assignments" AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])) OR (task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "task_labels_team_manage" ON public."task_labels" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_labels'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_labels'::text) AS user_has_capability)));

CREATE POLICY "tl_admin" ON public."task_labels" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "tl_read" ON public."task_labels" AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "task_notes_insert" ON public."task_notes" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM tasks)));

CREATE POLICY "task_notes_visible" ON public."task_notes" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((task_id IN ( SELECT tasks.id
   FROM tasks)));

CREATE POLICY "task_steps_admin" ON public."task_steps" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "task_steps_team" ON public."task_steps" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))))) OR ( SELECT user_has_capability('tasks.assign'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.complete'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.create'::text) AS user_has_capability))))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((task_id IN ( SELECT tasks.id
   FROM tasks
  WHERE (tasks.client_id IN ( SELECT team_client_assignment.client_id
           FROM team_client_assignment
          WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))))) OR ( SELECT user_has_capability('tasks.assign'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.complete'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.create'::text) AS user_has_capability))));

CREATE POLICY "task_template_steps_admin" ON public."task_template_steps" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "task_template_steps_team_read" ON public."task_template_steps" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['team'::text, 'admin'::text])));

CREATE POLICY "task_templates_admin_mutate" ON public."task_templates" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "task_templates_team" ON public."task_templates" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "task_templates_team_select" ON public."task_templates" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])));

CREATE POLICY "task_workdone_team_manage" ON public."task_workdone" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('workdone.manage'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('workdone.manage'::text) AS user_has_capability)));

CREATE POLICY "task_workdone_team_view_all" ON public."task_workdone" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('view_workdone_reports'::text) AS user_has_capability)));

CREATE POLICY "wd_self" ON public."task_workdone" AS PERMISSIVE FOR ALL TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR (( SELECT current_user_role() AS current_user_role) = 'admin'::text)))
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR (( SELECT current_user_role() AS current_user_role) = 'admin'::text)));

CREATE POLICY "wd_team_read" ON public."task_workdone" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'admin'::text) OR ((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT user_has_capability('view_workdone_reports'::text) AS user_has_capability)))));

CREATE POLICY "tasks_admin_all" ON public."tasks" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "tasks_team_delete" ON public."tasks" AS PERMISSIVE FOR DELETE TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('tasks.delete'::text) AS user_has_capability)));

CREATE POLICY "tasks_team_insert" ON public."tasks" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT user_has_capability('tasks.create'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.assign'::text) AS user_has_capability))));

CREATE POLICY "tasks_team_update_own" ON public."tasks" AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR (assigned_to = ( SELECT auth.uid() AS uid)) OR (reviewer_id = ( SELECT auth.uid() AS uid)) OR ( SELECT user_has_capability('tasks.edit'::text) AS user_has_capability))));

CREATE POLICY "tasks_team_verify" ON public."tasks" AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('verify_tasks'::text) AS user_has_capability)));

CREATE POLICY "tasks_team_view" ON public."tasks" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ((client_id IN ( SELECT team_client_assignment.client_id
   FROM team_client_assignment
  WHERE (team_client_assignment.team_user_id = ( SELECT auth.uid() AS uid)))) OR (assigned_to = ( SELECT auth.uid() AS uid)) OR (reviewer_id = ( SELECT auth.uid() AS uid)) OR ( SELECT user_has_capability('tasks.view'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.assign'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.complete'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.create'::text) AS user_has_capability) OR ( SELECT user_has_capability('tasks.edit'::text) AS user_has_capability))));

CREATE POLICY "tca_admin" ON public."team_client_assignment" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "tca_admin_mutate" ON public."team_client_assignment" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "tca_admin_select" ON public."team_client_assignment" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text])));

CREATE POLICY "tca_team_write" ON public."team_client_assignment" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('clients.assign_team'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('clients.assign_team'::text) AS user_has_capability)));

CREATE POLICY "ubea_admin" ON public."user_billing_entity_access" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "ubea_self" ON public."user_billing_entity_access" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR (( SELECT current_user_role() AS current_user_role) = 'admin'::text)));

CREATE POLICY "user_billing_entity_access_team_manage" ON public."user_billing_entity_access" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_billing_entities'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('manage_billing_entities'::text) AS user_has_capability)));

CREATE POLICY "profiles_admin_all" ON public."users_profile" AS PERMISSIVE FOR ALL TO authenticated
  USING ((( SELECT current_user_role() AS current_user_role) = 'admin'::text))
  WITH CHECK ((( SELECT current_user_role() AS current_user_role) = 'admin'::text));

CREATE POLICY "profiles_self_update" ON public."users_profile" AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "profiles_self_view" ON public."users_profile" AS PERMISSIVE FOR SELECT TO authenticated
  USING (((id = ( SELECT auth.uid() AS uid)) OR (( SELECT current_user_role() AS current_user_role) = ANY (ARRAY['admin'::text, 'team'::text]))));

CREATE POLICY "users_profile_team_manage" ON public."users_profile" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('staff.manage'::text) AS user_has_capability) AND (is_prime_admin = false)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('staff.manage'::text) AS user_has_capability) AND (is_prime_admin = false)));

CREATE POLICY "weekly_timesheet_submissions_team_approve" ON public."weekly_timesheet_submissions" AS PERMISSIVE FOR ALL TO authenticated
  USING (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('attendance.approve'::text) AS user_has_capability)))
  WITH CHECK (((( SELECT current_user_role() AS current_user_role) = 'team'::text) AND ( SELECT user_has_capability('attendance.approve'::text) AS user_has_capability)));

CREATE POLICY "weekly_ts_insert_own" ON public."weekly_timesheet_submissions" AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "weekly_ts_select_manager" ON public."weekly_timesheet_submissions" AS PERMISSIVE FOR SELECT TO public
  USING ((manager_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "weekly_ts_select_own" ON public."weekly_timesheet_submissions" AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "weekly_ts_update_manager" ON public."weekly_timesheet_submissions" AS PERMISSIVE FOR UPDATE TO public
  USING ((manager_id = ( SELECT auth.uid() AS uid)));

-- ---------------------------------------------------------------------------
-- Table privileges: signed-in users and the service role. Anonymous visitors get nothing.
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON public.rate_limit_counters FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
