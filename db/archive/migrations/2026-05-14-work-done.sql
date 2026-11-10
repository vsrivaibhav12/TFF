-- work_done — general work log (not task-specific; task_workdone is the richer parallel table)
CREATE TABLE IF NOT EXISTS work_done (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id),
  client_id UUID REFERENCES clients(id),
  task_id UUID REFERENCES tasks(id),
  date DATE NOT NULL,
  started_at TIME,
  ended_at TIME,
  minutes INT,
  description TEXT,
  category TEXT,
  is_billable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_done_user_date ON work_done(user_id, date);
CREATE INDEX IF NOT EXISTS idx_work_done_client ON work_done(client_id);

ALTER TABLE work_done ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wd_self ON work_done;
CREATE POLICY wd_self ON work_done FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (user_id = auth.uid() OR public.current_user_role() IN ('admin', 'team'));
