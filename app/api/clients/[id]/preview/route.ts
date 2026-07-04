import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await hasCapability(me, 'clients.read.all'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createClient();
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('business_name, primary_contact_name')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { count: openWorkCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', params.id)
    .eq('is_deleted', false)
    .in('status', ['pending', 'in_progress']);

  const { data: compliance } = await supabase
    .from('compliance_status')
    .select('status')
    .eq('client_id', params.id)
    .limit(100);

  const filed = compliance?.filter((r) => r.status === 'filed').length ?? 0;
  const total = (compliance?.length ?? 0);
  const complianceScore = total > 0 ? Math.round((filed / total) * 100) : null;

  return NextResponse.json({
    business_name: client.business_name,
    primary_contact_name: client.primary_contact_name,
    open_work_count: openWorkCount ?? 0,
    compliance_score: complianceScore,
  });
}
