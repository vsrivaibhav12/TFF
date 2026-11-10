-- Fix notices RLS policies
-- 1. Drop the over-permissioned notices_admin_team_select which allowed ALL team users to read ALL notices
-- 2. Add client SELECT policy so portal users can view their own notices

DROP POLICY IF EXISTS "notices_admin_team_select" ON notices;

-- Client view: only notices belonging to clients the user is linked to
DROP POLICY IF EXISTS "notices_client_view" ON notices;
CREATE POLICY "notices_client_view" ON notices
FOR SELECT
USING (
  client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid() AND is_active = TRUE)
);
