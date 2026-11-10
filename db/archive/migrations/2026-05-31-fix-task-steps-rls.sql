DROP POLICY IF EXISTS "task_steps_team" ON task_steps;
CREATE POLICY "task_steps_team" ON task_steps
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (
      task_id IN (
        SELECT id FROM tasks WHERE client_id IN (
          SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
        )
        OR assigned_to = auth.uid()
        OR reviewer_id = auth.uid()
      )
      OR public.user_has_capability('tasks.assign')
      OR public.user_has_capability('tasks.complete')
      OR public.user_has_capability('tasks.create')
    )
  )
  WITH CHECK (
    public.current_user_role() = 'team'
    AND (
      task_id IN (
        SELECT id FROM tasks WHERE client_id IN (
          SELECT client_id FROM team_client_assignment WHERE team_user_id = auth.uid()
        )
        OR assigned_to = auth.uid()
        OR reviewer_id = auth.uid()
      )
      OR public.user_has_capability('tasks.assign')
      OR public.user_has_capability('tasks.complete')
      OR public.user_has_capability('tasks.create')
    )
  );
