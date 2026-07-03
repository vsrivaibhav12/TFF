import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function listEntityAuditLogs(entityType: string, entityId: string, limit = 50) {
  const sb = createClient();
  const { data, error } = await sb
    .from('global_audit_log')
    .select('id, action, entity_type, entity_id, details, performed_at, performed_by:users_profile!global_audit_log_performed_by_fkey(full_name, email)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('performed_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data ?? [];
}

export async function listRecentAuditLogs(limit = 8) {
  const sb = createClient();
  const { data, error } = await sb
    .from('global_audit_log')
    .select('id, action, entity_type, entity_id, details, performed_at, performed_by:users_profile!global_audit_log_performed_by_fkey(full_name, email)')
    .order('performed_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data ?? [];
}
