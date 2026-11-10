-- task_steps_client_read still referenced the removed 'awaiting_client' status,
-- so it never matched any rows after v3.3. Update to the current client-visible
-- task model: in_progress + blocked on client, or completed.
DROP POLICY IF EXISTS "task_steps_client_read" ON task_steps;
CREATE POLICY "task_steps_client_read" ON task_steps
  FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE client_id IN (
        SELECT client_id FROM client_users
        WHERE user_id = auth.uid() AND is_active = TRUE
      )
      AND status IN ('in_progress', 'completed')
      AND (status != 'in_progress' OR is_blocked_on_client = TRUE)
    )
  );
