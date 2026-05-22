import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listLeaveRequests(filter?: { userId?: string; status?: string; limit?: number; offset?: number }) {
  const sb = createClient();
  let q = sb
    .from('leave_requests')
    .select('id, user_id, leave_type, from_date, to_date, number_of_days, reason, status, reviewed_by, reviewed_at, review_remarks, created_at, users_profile!leave_requests_user_id_fkey(full_name, email)')
    .order('created_at', { ascending: false });
  if (filter?.userId) q = q.eq('user_id', filter.userId);
  if (filter?.status) q = q.eq('status', filter.status);
  const limit = filter?.limit ?? 200;
  const offset = filter?.offset ?? 0;
  q = q.range(offset, offset + limit - 1);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// H-2: Repository functions for leave operations (previously inline in actions)
export async function getLeaveRequestById(id: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('leave_requests')
    .select('id, user_id, leave_type, from_date, to_date, number_of_days, reason, status, reviewed_by')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createLeaveRequest(payload: {
  user_id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  number_of_days: number;
  reason?: string;
  status: string;
}) {
  const sb = createClient();
  const { data, error } = await sb
    .from('leave_requests')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export async function updateLeaveRequestStatus(id: string, payload: {
  status: string;
  reviewed_by: string;
  reviewed_at: string;
  review_remarks?: string;
}) {
  const sb = createClient();
  const { error } = await sb
    .from('leave_requests')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}
