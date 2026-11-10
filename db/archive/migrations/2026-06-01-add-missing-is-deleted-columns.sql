-- Migration: Add is_deleted columns to tables missing soft-delete support
-- These tables are referenced in code with .eq('is_deleted', false) filters
-- but the columns did not exist in the base schema, causing runtime crashes.

-- Add is_deleted to queries
ALTER TABLE queries
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_queries_is_deleted ON queries(is_deleted);

-- Add is_deleted to hearings
ALTER TABLE hearings
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_hearings_is_deleted ON hearings(is_deleted);

-- Add is_deleted to compliance_calendar_events
ALTER TABLE compliance_calendar_events
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_compliance_calendar_events_is_deleted ON compliance_calendar_events(is_deleted);

-- Also add deleted_at/deleted_by for full soft-delete pattern (optional but consistent)
ALTER TABLE queries
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users_profile(id);

ALTER TABLE hearings
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users_profile(id);

ALTER TABLE compliance_calendar_events
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users_profile(id);
