import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listAllNotices(filter?: {
  clientId?: string;
  clientIds?: string[];
  status?: string | string[];
  noticeType?: string;
  dueFrom?: string;
  dueTo?: string;
}) {
  const sb = createClient();
  let q = sb
    .from('notices')
    .select('id, client_id, notice_type, notice_number, issuing_authority, notice_received_date, due_date, status, subject, amount_involved, assigned_to, clients!notices_client_id_fkey(business_name), users_profile!notices_assigned_to_fkey(full_name)')
    .eq('is_deleted', false)
    .order('notice_received_date', { ascending: false, nullsFirst: false });
  if (filter?.clientId) q = q.eq('client_id', filter.clientId);
  if (filter?.clientIds && filter.clientIds.length > 0) q = q.in('client_id', filter.clientIds);
  if (filter?.status) {
    if (Array.isArray(filter.status)) q = q.in('status', filter.status);
    else q = q.eq('status', filter.status);
  }
  if (filter?.noticeType) q = q.eq('notice_type', filter.noticeType);
  if (filter?.dueFrom) q = q.gte('due_date', filter.dueFrom);
  if (filter?.dueTo) q = q.lte('due_date', filter.dueTo);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return data ?? [];
}

function normalizeFkArray(row: any, key: string) {
  if (row && Array.isArray(row[key]) && row[key].length > 0) {
    row[key] = row[key][0];
  } else if (row && Array.isArray(row[key])) {
    row[key] = null;
  }
}

export interface NoticeRow {
  id: string;
  client_id: string;
  notice_type: string;
  notice_number: string | null;
  issuing_authority: string | null;
  notice_date: string | null;
  notice_received_date: string | null;
  due_date: string | null;
  status: string;
  amount_involved: number | null;
  subject: string | null;
  description: string | null;
  assigned_to: string | null;
  notice_document_id: string | null;
  reply_document_id: string | null;
  order_document_id: string | null;
  created_at: string;
  updated_at: string;
  clients: { business_name: string } | null;
  users_profile: { full_name: string; email: string } | null;
}

export async function getNoticeById(id: string): Promise<NoticeRow | null> {
  const sb = createClient();
  const { data, error } = await sb
    .from('notices')
    .select('id, client_id, notice_type, notice_number, issuing_authority, notice_date, notice_received_date, due_date, status, amount_involved, subject, description, assigned_to, notice_document_id, reply_document_id, order_document_id, created_at, updated_at, clients!notices_client_id_fkey(business_name), users_profile!notices_assigned_to_fkey(full_name, email)')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    normalizeFkArray(data, 'clients');
    normalizeFkArray(data, 'users_profile');
  }
  return data as NoticeRow | null;
}

export async function listHearings(filter?: {
  clientId?: string;
  noticeId?: string;
  status?: string;
  hearingType?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const sb = createClient();
  let q = sb
    .from('hearings')
    .select('id, client_id, hearing_type, hearing_scheduled_date, hearing_held_date, next_hearing_date, status, venue, officer_name, subject, order_amount, order_date, clients!hearings_client_id_fkey(business_name)')
    .eq('is_deleted', false)
    .order('hearing_scheduled_date', { ascending: true, nullsFirst: false });
  if (filter?.clientId) q = q.eq('client_id', filter.clientId);
  if (filter?.noticeId) q = q.eq('notice_id', filter.noticeId);
  if (filter?.status) q = q.eq('status', filter.status);
  if (filter?.hearingType) q = q.eq('hearing_type', filter.hearingType);
  if (filter?.dateFrom) q = q.gte('hearing_scheduled_date', filter.dateFrom);
  if (filter?.dateTo) q = q.lte('hearing_scheduled_date', filter.dateTo);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function listNoticesForUser(userId: string, filter?: {
  clientId?: string;
  status?: string | string[];
  noticeType?: string;
  dueFrom?: string;
  dueTo?: string;
}) {
  const sb = createClient();
  let q = sb
    .from('notices')
    .select('id, client_id, notice_type, notice_number, issuing_authority, notice_received_date, due_date, status, subject, amount_involved, assigned_to, clients!notices_client_id_fkey(business_name), users_profile!notices_assigned_to_fkey(full_name)')
    .eq('is_deleted', false)
    .eq('assigned_to', userId)
    .order('notice_received_date', { ascending: false, nullsFirst: false });
  if (filter?.clientId) q = q.eq('client_id', filter.clientId);
  if (filter?.status) {
    if (Array.isArray(filter.status)) q = q.in('status', filter.status);
    else q = q.eq('status', filter.status);
  }
  if (filter?.noticeType) q = q.eq('notice_type', filter.noticeType);
  if (filter?.dueFrom) q = q.gte('due_date', filter.dueFrom);
  if (filter?.dueTo) q = q.lte('due_date', filter.dueTo);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return data ?? [];
}
