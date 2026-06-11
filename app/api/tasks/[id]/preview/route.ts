import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface TaskPreviewRow {
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  period_year: number | null;
  period_month: number | null;
  period_quarter: number | null;
  clients: { business_name: string } | { business_name: string }[] | null;
  sub_services: { name: string } | { name: string }[] | null;
  users_profile: { full_name: string } | { full_name: string }[] | null;
  task_notes: Array<{ content: string }> | null;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      title,
      status,
      priority,
      due_date,
      period_year,
      period_month,
      period_quarter,
      clients!tasks_client_id_fkey(business_name),
      sub_services!tasks_sub_service_id_fkey(name),
      users_profile!tasks_assigned_to_fkey(full_name),
      task_notes(content)
    `)
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Supabase returns one-to-many as arrays
  const task = data as TaskPreviewRow;
  const clients = task.clients;
  const subServices = task.sub_services;
  const usersProfile = task.users_profile;
  const notes = task.task_notes;
  const latestNote = notes && notes.length > 0 ? notes[notes.length - 1].content : null;

  return NextResponse.json({
    title: task.title,
    sub_service_name: Array.isArray(subServices) ? subServices[0]?.name ?? null : subServices?.name ?? null,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    period_year: task.period_year,
    period_month: task.period_month,
    period_quarter: task.period_quarter,
    client_name: Array.isArray(clients) ? clients[0]?.business_name ?? null : clients?.business_name ?? null,
    assignee_name: Array.isArray(usersProfile) ? usersProfile[0]?.full_name ?? null : usersProfile?.full_name ?? null,
    latest_note: latestNote,
  });
}
