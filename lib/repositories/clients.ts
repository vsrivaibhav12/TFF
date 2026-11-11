import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/supabase/fetch-all';
import { mergeById, wrapLike } from '@/lib/supabase/safe-search';

const DEFAULT_CLIENT_FIELDS =
  'id, business_name, pan, gstin, category, primary_contact_person, primary_contact_email, primary_contact_phone, primary_owner_id, group_id, city, created_at, updated_at, client_groups!clients_group_id_fkey(name)';

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
  const offset = opts.offset ?? 0;
  const selectFields = opts.fields ? opts.fields.join(', ') : DEFAULT_CLIENT_FIELDS;

  const applyFilters = (query: any) => {
    if (opts.groupId) query = query.eq('group_id', opts.groupId);
    if (opts.city) query = query.ilike('city', wrapLike(opts.city));
    return query;
  };

  // PostgREST silently caps every response at max_rows (1000). Without an
  // explicit range, any client list longer than that is truncated, which hid
  // every client sorted after roughly the letter S. Always page explicitly.
  // `id` is a tie-breaker so ranges stay stable between pages.
  const run = async (build: () => any): Promise<any[]> => {
    const ordered = () => build().order('business_name', { ascending: true }).order('id', { ascending: true });
    if (opts.limit !== undefined) {
      const wanted = offset + opts.limit;
      return fetchAll<any>(ordered, wanted, 1000);
    }
    return fetchAll<any>(ordered);
  };

  const base = () => applyFilters(sb.from('clients').select(selectFields).eq('is_deleted', false));

  let data: any[];
  if (opts.q) {
    // Separate queries per column avoid PostgREST `.or()` injection from user input.
    const term = wrapLike(opts.q);
    const [nameRows, panRows, gstinRows] = await Promise.all([
      run(() => base().ilike('business_name', term)),
      run(() => base().ilike('pan', term)),
      run(() => base().ilike('gstin', term)),
    ]);
    data = mergeById([nameRows, panRows, gstinRows]);
    data.sort((a: any, b: any) => String(a.business_name).localeCompare(String(b.business_name)));
  } else {
    data = await run(base);
  }

  return opts.limit !== undefined ? data.slice(offset, offset + opts.limit) : data.slice(offset);
}

export async function countAccessibleClients(opts: {
  groupId?: string;
  city?: string;
  q?: string;
} = {}) {
  const sb = createClient();
  const applyFilters = (query: any) => {
    if (opts.groupId) query = query.eq('group_id', opts.groupId);
    if (opts.city) query = query.ilike('city', wrapLike(opts.city));
    return query;
  };

  if (opts.q) {
    // A client can match on name AND pan, so adding counts double-counts.
    // Fetch ids only and de-duplicate.
    const term = wrapLike(opts.q);
    const idsFor = (col: string) =>
      fetchAll<{ id: string }>(() =>
        applyFilters(sb.from('clients').select('id').eq('is_deleted', false).ilike(col, term)).order('id'),
      );
    const [a, b, c] = await Promise.all([idsFor('business_name'), idsFor('pan'), idsFor('gstin')]);
    return new Set([...a, ...b, ...c].map((r) => r.id)).size;
  }

  const { count, error } = await applyFilters(
    sb.from('clients').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
  );
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
  const { data, error } = await sb
    .from('clients')
    .update(payload)
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw Object.assign(new Error('Client not found or you do not have permission to change it.'), { code: 'NOT_FOUND' });
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
  const { data, error } = await sb
    .from('team_client_assignment')
    .update({ assigned_to: todayIST() })
    .eq('id', assignmentId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw Object.assign(new Error('Assignment not found or you do not have permission to end it.'), { code: 'NOT_FOUND' });
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
