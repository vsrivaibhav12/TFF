-- Weekly timesheet submission and approval workflow
-- Created: 2026-05-13

CREATE TABLE IF NOT EXISTS weekly_timesheet_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES users_profile(id) ON DELETE SET NULL,

  week_start DATE NOT NULL,
  week_end DATE NOT NULL,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),

  -- Auto-computed summary at time of submission
  present_days INT DEFAULT 0,
  leave_days INT DEFAULT 0,
  wfh_days INT DEFAULT 0,
  half_days INT DEFAULT 0,
  permission_hours NUMERIC(4,1) DEFAULT 0,

  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users_profile(id) ON DELETE SET NULL,
  review_remarks TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- One submission per user per week
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_ts_user_id ON weekly_timesheet_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_ts_manager_id ON weekly_timesheet_submissions(manager_id);
CREATE INDEX IF NOT EXISTS idx_weekly_ts_status ON weekly_timesheet_submissions(status);
CREATE INDEX IF NOT EXISTS idx_weekly_ts_week_start ON weekly_timesheet_submissions(week_start);

-- RLS
ALTER TABLE weekly_timesheet_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_ts_select_own"
  ON weekly_timesheet_submissions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "weekly_ts_select_manager"
  ON weekly_timesheet_submissions
  FOR SELECT
  USING (manager_id = auth.uid());

CREATE POLICY "weekly_ts_insert_own"
  ON weekly_timesheet_submissions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "weekly_ts_update_manager"
  ON weekly_timesheet_submissions
  FOR UPDATE
  USING (manager_id = auth.uid());
