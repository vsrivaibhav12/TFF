import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface QueryRow {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  created_by: string;
  assigned_to: string | null;
  clients: { business_name: string } | null;
  creator: { full_name: string } | null;
}

function normalizeFkArray(row: any, key: string) {
  if (row && Array.isArray(row[key]) && row[key].length > 0) {
    row[key] = row[key][0];
  } else if (row && Array.isArray(row[key])) {
    row[key] = null;
  }
}

export async function listQueries(
  opts: {
    clientId?: string;
    clientIds?: string[];
    status?: string[];
    mineOnly?: boolean;
    userId?: string;
  } = {}
): Promise<QueryRow[]> {
  const sb = createClient();
  let q = sb
    .from('queries')
    .select('id, subject, status, priority, created_at, updated_at, client_id, created_by, assigned_to, clients!queries_client_id_fkey(business_name), creator:users_profile!queries_created_by_fkey(full_name)')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });
  if (opts.clientId) q = q.eq('client_id', opts.clientId);
  if (opts.clientIds?.length) q = q.in('client_id', opts.clientIds.slice(0, 100));
  if (opts.status?.length) q = q.in('status', opts.status);
  if (opts.mineOnly && opts.userId) q = q.eq('created_by', opts.userId);
  const { data, error } = await q;
  if (error) throw error;
  for (const row of (data ?? []) as any[]) {
    normalizeFkArray(row, 'clients');
    normalizeFkArray(row, 'creator');
  }
  return (data ?? []) as unknown as QueryRow[];
}

export async function getQueryWithMessages(queryId: string) {
  const sb = createClient();
  const { data: query, error } = await sb
    .from('queries')
    .select('*, clients!queries_client_id_fkey(business_name), creator:users_profile!queries_created_by_fkey(full_name, email), assignee:users_profile!queries_assigned_to_fkey(full_name, email)')
    .eq('id', queryId)
    .maybeSingle();
  if (error) throw error;
  if (!query) return null;
  const { data: messages, error: e2 } = await sb
    .from('query_messages')
    .select('id, message_text, created_at, sender_id, users_profile!query_messages_sender_id_fkey(full_name, email, role)')
    .eq('query_id', queryId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });
  if (e2) throw e2;
  return { query, messages: messages ?? [] };
}
