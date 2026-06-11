import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface InboxItem {
  id: string;
  type: 'task' | 'notice' | 'query' | 'compliance';
  title: string;
  status: string;
  priority?: string;
  due_date: string | null;
  created_at: string;
  client_id?: string | null;
  client_name?: string | null;
  assignee_name?: string | null;
  meta?: Record<string, any>;
}

export async function fetchUnifiedInbox(opts: {
  userId: string;
  role: string;
  limit?: number;
  offset?: number;
}): Promise<InboxItem[]> {
  const sb = createClient();
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;

  // Fetch tasks
  const { data: tasks } = await sb
    .from('tasks')
    .select('id, title, status, priority, due_date, created_at, client_id, assigned_to, clients:business_name, users_profile:assigned_to(full_name)')
    .eq('is_deleted', false)
    .not('status', 'in', '(completed,cancelled)')
    .order('due_date', { ascending: true })
    .limit(limit);

  // Fetch notices
  const { data: notices } = await sb
    .from('notices')
    .select('id, subject, status, due_date, created_at, client_id, clients:business_name, notice_type')
    .eq('is_deleted', false)
    .not('status', 'eq', 'closed')
    .order('due_date', { ascending: true })
    .limit(limit);

  // Fetch queries
  const { data: queries } = await sb
    .from('queries')
    .select('id, subject, status, created_at, client_id, clients:business_name')
    .eq('is_deleted', false)
    .not('status', 'eq', 'resolved')
    .order('created_at', { ascending: false })
    .limit(limit);

  // Fetch compliance events
  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const { data: compliance } = await sb
    .from('compliance_calendar_events')
    .select('id, title, event_type, due_date, created_at, client_id, clients:business_name')
    .eq('is_deleted', false)
    .gte('due_date', today)
    .lte('due_date', weekAhead)
    .order('due_date', { ascending: true })
    .limit(limit);

  const items: InboxItem[] = [];

  (tasks ?? []).forEach((t: any) => {
    items.push({
      id: t.id,
      type: 'task',
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      created_at: t.created_at,
      client_id: t.client_id,
      client_name: t.clients?.business_name ?? null,
      assignee_name: t.users_profile?.full_name ?? null,
    });
  });

  (notices ?? []).forEach((n: any) => {
    items.push({
      id: n.id,
      type: 'notice',
      title: n.subject ?? 'Untitled notice',
      status: n.status,
      due_date: n.due_date,
      created_at: n.created_at,
      client_id: n.client_id,
      client_name: n.clients?.business_name ?? null,
      meta: { notice_type: n.notice_type },
    });
  });

  (queries ?? []).forEach((q: any) => {
    items.push({
      id: q.id,
      type: 'query',
      title: q.subject ?? 'Untitled query',
      status: q.status,
      due_date: null,
      created_at: q.created_at,
      client_id: q.client_id,
      client_name: q.clients?.business_name ?? null,
    });
  });

  (compliance ?? []).forEach((c: any) => {
    items.push({
      id: c.id,
      type: 'compliance',
      title: c.title ?? c.event_type ?? 'Compliance event',
      status: 'upcoming',
      due_date: c.due_date,
      created_at: c.created_at,
      client_id: c.client_id,
      client_name: c.clients?.business_name ?? null,
      meta: { event_type: c.event_type },
    });
  });

  // Sort: overdue first, then by due date, then by created_at
  items.sort((a, b) => {
    const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    const aCreated = new Date(a.created_at).getTime();
    const bCreated = new Date(b.created_at).getTime();

    // Items with due dates come before items without
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;

    // Both have due dates: sort by due date
    if (a.due_date && b.due_date) {
      if (aDue !== bDue) return aDue - bDue;
    }

    // Fallback to created_at (newest first)
    return bCreated - aCreated;
  });

  return items.slice(offset, offset + limit);
}
