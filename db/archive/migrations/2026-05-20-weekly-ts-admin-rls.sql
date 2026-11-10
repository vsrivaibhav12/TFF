-- Allow admins to view all weekly timesheet submissions for approval oversight
ALTER TABLE public.weekly_timesheet_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_ts_admin_select ON public.weekly_timesheet_submissions;
CREATE POLICY weekly_ts_admin_select ON public.weekly_timesheet_submissions
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin'::text);
