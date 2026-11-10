-- ============================================================================
-- FIX: tasks_team_update_own was checking tasks.assign / tasks.complete
-- instead of tasks.edit. This meant revoking tasks.edit did not prevent
-- team members from editing task fields.
-- ============================================================================

DROP POLICY IF EXISTS "tasks_team_update_own" ON tasks;
CREATE POLICY "tasks_team_update_own" ON tasks
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      client_id IN (SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid())
      OR assigned_to = auth.uid()
      OR reviewer_id = auth.uid()
      OR public.user_has_capability('tasks.edit')
    )
  );
