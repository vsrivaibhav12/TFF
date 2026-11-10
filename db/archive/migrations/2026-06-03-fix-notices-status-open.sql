-- Fix notices table to include 'open' as a valid status
-- The application code expects 'open' to be a valid status for notices

-- Drop the existing CHECK constraint and recreate it with 'open' included
ALTER TABLE public.notices DROP CONSTRAINT IF EXISTS notices_status_check;
ALTER TABLE public.notices ADD CONSTRAINT notices_status_check CHECK (status IN (
  'received', 'reply_pending', 'reply_submitted', 'hearing_pending', 'hearing_held', 
  'order_pending', 'order_received', 'closed', 'open'
));
