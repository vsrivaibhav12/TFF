import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/supabase/fetch-all';
import { mergeById, wrapLike } from '@/lib/supabase/safe-search';

const DEFAULT_CLIENT_FIELDS =
  'id, business_name, pan, gstin, category, primary_contact_person, primary_contact_email, primary_contact_phone, primary_owner_id, group_id, portal_enabled, city, created_at, updated_at, client_groups!clients_group_id_fkey(name)';

export async function listAccessibleClients(opts: {
  groupId?: string;
  stage?: string;
  city?: string;
  q?: string;
  limit?: number;
  offset?: number;
  fields?: string[];
} = {}) {
  const sb = createClient();
  const limit = opts.limit ?? 1000;
  const offset = opts.offset ?? 0;
  const selectFields = opts.fields ? opts.fields.join(', ') : DEFAULT_CLIENT_FIELDS;

  const baseQuery = () =>
    sb.from('clients').select(selectFields).eq('is_deleted', false);

  const fetchOrdered = (query: any) =>
    query.order('business_name', { ascending: true });

  const applyFilters = (query: any) => {
    if (opts.groupId) query = query.eq('group_id', opts.groupId);
    if (opts.city) query = query.ilike('city', wrapLike(opts.city));
    return query;
  };

  let data: any[] = [];

  if (opts.q) {
    // Search across multiple columns with separate queries to avoid PostgREST
    // `.or()` injection from user input.
    const term = wrapLike(opts.q);
    const [nameRes, panRes] = await Promise.all([
      fetchOrdered(applyFilters(sb.from('clients').select(selectFields).eq('is_deleted', false).ilike('business_name', term))),
      fetchOrdered(applyFilters(sb.from('clients').select(selectFields).eq('is_deleted', false).ilike('pan', term))),
    ]);
    if (nameRes.error) throw nameRes.error;
    if (panRes.error) throw panRes.error;
    data = mergeById([nameRes.data ?? [], panRes.data ?? []]);
  } else {
    const { data: rows, error } = await fetchOrdered(applyFilters(baseQuery()));
    if (error) throw error;
    data = rows ?? [];
  }

  return data.slice(offset, offset + limit);
}

export async function countAccessibleClients(opts: {
  groupId?: string;
  city?: string;
  q?: string;
} = {}) {
  const sb = createClient();
  let q = sb
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('is_deleted', false);
  if (opts.groupId) q = q.eq('group_id', opts.groupId);
  if (opts.city) q = q.ilike('city', wrapLike(opts.city));
  if (opts.q) {
    const term = wrapLike(opts.q);
    const nameQ = sb.from('clients').select('id', { count: 'exact', head: true }).eq('is_deleted', false).ilike('business_name', term);
    const panQ = sb.from('clients').select('id', { count: 'exact', head: true }).eq('is_deleted', false).ilike('pan', term);
    if (opts.groupId) {
      nameQ.eq('group_id', opts.groupId);
      panQ.eq('group_id', opts.groupId);
    }
    const [nameRes, panRes] = await Promise.all([nameQ, panQ]);
    return (nameRes.count ?? 0) + (panRes.count ?? 0);
  }
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function getClientById(id: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('clients')
    .select('*, client_groups!clients_group_id_fkey(name)')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listClientGroups() {
  const sb = createClient();
  const { data, error } = await sb
    .from('client_groups')
    .select('id, name, description')
    .eq('is_deleted', false)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function listTeamUsers() {
  const sb = createClient();
  const { data, error } = await sb
    .from('users_profile')
    .select('id, full_name, email, role, is_active, reports_to, is_prime_admin')
    .in('role', ['team', 'admin'])
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function listClientUsers(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('client_users')
    .select('id, role_in_client, is_active, user_id, users_profile!client_users_user_id_fkey(id, full_name, email)')
    .eq('client_id', clientId)
    .eq('is_deleted', false);
  if (error) throw error;
  return data ?? [];
}

export async function listTeamAssignments(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from('team_client_assignment')
    .select('id, role, assigned_from, assigned_to, team_user_id, users_profile!team_client_assignment_team_user_id_fkey(id, full_name, email)')
    .eq('client_id', clientId)
    .order('assigned_from', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createClientRecord(payload: any) {
  const sb = createClient();
  const { data, error } = await sb
    .from('clients')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClientRecord(id: string, payload: any) {
  const sb = createClient();
  const { error } = await sb
    .from('clients')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

export async function assignTeamMember(clientId: string, teamUserId: string, role: string) {
  const sb = createClient();
  const { todayIST } = await import('@/lib/utils');
  const { error } = await sb.from('team_client_assignment').insert({
    client_id: clientId,
    team_user_id: teamUserId,
    role: role,
    assigned_from: todayIST(),
  });
  if (error) throw error;
}

export async function unassignTeamMember(assignmentId: string) {
  const sb = createClient();
  const { todayIST } = await import('@/lib/utils');
  const { error } = await sb
    .from('team_client_assignment')
    .update({ assigned_to: todayIST() })
    .eq('id', assignmentId);
  if (error) throw error;
}

export async function createClientGroupRecord(payload: { name: string; description?: string | null }) {
  const sb = createClient();
  const { data, error } = await sb.from('client_groups').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateClientGroupRecord(id: string, payload: { name?: string; description?: string | null }) {
  const sb = createClient();
  const { error } = await sb.from('client_groups').update(payload).eq('id', id);
  if (error) throw error;
}

export async function softDeleteClientGroupRecord(id: string) {
  const sb = createClient();
  const { error } = await sb.from('client_groups').update({ is_deleted: true }).eq('id', id);
  if (error) throw error;
}
