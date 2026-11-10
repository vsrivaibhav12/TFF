-- Compliance calendar events: support service-driven events (from sub_services)
-- 1. Make rule_id nullable so service-driven events can have rule_id=NULL
-- 2. Add sub_service_id column
-- 3. Add unique index for service-driven de-duplication

ALTER TABLE public.compliance_calendar_events
  ALTER COLUMN rule_id DROP NOT NULL;

ALTER TABLE public.compliance_calendar_events
  ADD COLUMN IF NOT EXISTS sub_service_id UUID REFERENCES public.sub_services(id) ON DELETE CASCADE;

-- Unique index for rule-driven events (existing behaviour)
DROP INDEX IF EXISTS uq_cce_client_rule_period;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cce_client_rule_period
  ON public.compliance_calendar_events(client_id, rule_id, period_label)
  WHERE rule_id IS NOT NULL;

-- Unique index for service-driven events
CREATE UNIQUE INDEX IF NOT EXISTS uq_cce_client_subservice_period
  ON public.compliance_calendar_events(client_id, sub_service_id, period_label)
  WHERE sub_service_id IS NOT NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cce_sub_service ON public.compliance_calendar_events(sub_service_id);
