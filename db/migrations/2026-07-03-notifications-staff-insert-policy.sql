-- Allow admin/team users to manage notifications for other users through the regular server client.
-- This removes the need for notification-service.ts to use the service-role client for in-app rows.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_staff_insert ON public.notifications;
CREATE POLICY notif_staff_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));

DROP POLICY IF EXISTS notif_staff_update ON public.notifications;
CREATE POLICY notif_staff_update ON public.notifications FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'team'))
  WITH CHECK (public.current_user_role() IN ('admin', 'team'));
