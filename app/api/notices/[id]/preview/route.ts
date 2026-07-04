import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasCapability(me, 'notices.view'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createClient();
  const { data: notice, error } = await supabase
    .from('notices')
    .select('subject, notice_type, issuing_authority, due_date, status, clients!notices_client_id_fkey(business_name)')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single();

  if (error || !notice) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const clients = (notice as any).clients;

  return NextResponse.json({
    subject: notice.subject,
    notice_type: notice.notice_type,
    authority: notice.issuing_authority,
    due_date: notice.due_date,
    status: notice.status,
    client_name: Array.isArray(clients) ? clients[0]?.business_name ?? null : clients?.business_name ?? null,
  });
}
