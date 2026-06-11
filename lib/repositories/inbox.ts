import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface UnifiedInboxItem {
  id: string;
  item_type: 'task' | 'notice' | 'query' | 'compliance';
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  occurred_at: string;
  actor_id: string | null;
  client_id: string | null;
  client_name: string | null;
  related_entity_id: string | null;
  related_entity_type: string | null;
  meta: Record<string, unknown> | null;
}

export async function listUnifiedInbox(opts: { limit?: number; offset?: number } = {}): Promise<UnifiedInboxItem[]> {
  const sb = createClient();
  const limit = opts.limit ?? 200;
  const offset = opts.offset ?? 0;

  const { data, error } = await sb
    .from('v_unified_inbox')
    .select('*')
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as UnifiedInboxItem[];
}
