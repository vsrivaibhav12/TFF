-- Add updated_at to service catalogue tables that were missing it
-- Fixes: "Could not find the 'updated_at' column of 'services' in the schema cache"

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE service_categories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE sub_services
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
