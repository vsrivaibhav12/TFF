-- ============================================================================
-- 2026-11-11  Shared rate limiter
--
-- The old limiter kept its counters in each server instance's memory. On Vercel
-- every request can land on a different instance, so the limits barely applied.
-- Counters now live in the database and are shared by every instance.
-- Only the service role can call check_rate_limit (it is used from server code).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: nobody but the service role (which bypasses RLS) can touch it.
REVOKE ALL ON public.rate_limit_counters FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_rate_limit_counters_window ON public.rate_limit_counters (window_start);

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
RETURNS TABLE (allowed boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
