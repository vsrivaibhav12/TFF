-- Allow admin users to read/insert/update solution_log through the regular server client.
-- Previously only team + manage_solution_log was covered, forcing admin-triggered writes
-- to bypass RLS via the service-role client.
ALTER TABLE solution_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solution_log_team_select" ON solution_log;
CREATE POLICY "solution_log_team_select" ON solution_log
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR (
      public.current_user_role() = 'team'
      AND (
        client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
        OR public.user_has_capability('manage_solution_log')
      )
    )
  );

DROP POLICY IF EXISTS "solution_log_team_insert" ON solution_log;
CREATE POLICY "solution_log_team_insert" ON solution_log
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'admin'
    OR (
      public.current_user_role() = 'team'
      AND (
        client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
        OR public.user_has_capability('manage_solution_log')
      )
    )
  );

DROP POLICY IF EXISTS "solution_log_team_update" ON solution_log;
CREATE POLICY "solution_log_team_update" ON solution_log
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'admin'
    OR (
      public.current_user_role() = 'team'
      AND (
        client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
        OR public.user_has_capability('manage_solution_log')
      )
    )
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
    OR (
      public.current_user_role() = 'team'
      AND (
        client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
        OR public.user_has_capability('manage_solution_log')
      )
    )
  );
