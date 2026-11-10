-- Link compliance calendar rules to sub_services for service-driven compliance
ALTER TABLE compliance_calendar_rules
  ADD COLUMN IF NOT EXISTS sub_service_id UUID REFERENCES sub_services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ccr_sub_service ON compliance_calendar_rules(sub_service_id);

-- Make rule_id nullable in events so service-driven events can exist without a traditional rule
ALTER TABLE compliance_calendar_events
  ALTER COLUMN rule_id DROP NOT NULL;

-- Add a direct sub_service_id column to events for easier querying
ALTER TABLE compliance_calendar_events
  ADD COLUMN IF NOT EXISTS sub_service_id UUID REFERENCES sub_services(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cce_sub_service ON compliance_calendar_events(sub_service_id);

-- Add partial unique index for service-driven events (when rule_id is null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cce_service_period_unique
  ON compliance_calendar_events(client_id, sub_service_id, period_label)
  WHERE sub_service_id IS NOT NULL;
