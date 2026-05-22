import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listPermissionRequests(opts: { userId?: string; status?: string } = {}) {
  const sb = createClient();
  let q = sb
    .from('permission_requests')
    .select('id, request_date, from_time, to_time, reason, status, reviewed_by, reviewed_at, review_remarks, created_at, user_id')
    .order('created_at', { ascending: false });
  if (opts.userId) q = q.eq('user_id', opts.userId);
  if (opts.status) q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) throw error;

  // Fetch user names separately because permission_requests FK points to auth.users,
  // so PostgREST cannot resolve users_profile through the FK hint (PGRST200).
  const userIds = [...new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean))];
  const { data: users } =
    userIds.length > 0
      ? await sb.from('users_profile').select('id, full_name, email').in('id', userIds)
      : { data: [] };
  const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));

  return (data ?? []).map((r: any) => ({
    ...r,
    users_profile: userMap.get(r.user_id) ?? null,
  }));
}
