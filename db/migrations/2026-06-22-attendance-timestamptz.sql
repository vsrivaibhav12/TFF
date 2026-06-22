-- Convert attendance time columns to timezone-aware types so IST values are preserved.
-- Existing values were stored as UTC ISO strings, so interpret them as UTC during conversion.
ALTER TABLE attendance_logs
  ALTER COLUMN check_in_time TYPE TIMESTAMPTZ USING check_in_time AT TIME ZONE 'UTC',
  ALTER COLUMN check_out_time TYPE TIMESTAMPTZ USING check_out_time AT TIME ZONE 'UTC';
