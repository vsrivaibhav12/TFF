-- Permission / OD request table (additive, no breaking changes)
CREATE TABLE IF NOT EXISTS permission_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  request_date DATE NOT NULL,
  from_time TIME,
  to_time TIME,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP,
  review_remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_requests_user ON permission_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_requests_status ON permission_requests(status);

-- RLS
ALTER TABLE permission_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY permission_user_own ON permission_requests
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY permission_admin_all ON permission_requests
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin'::text)
  WITH CHECK (current_user_role() = 'admin'::text);
