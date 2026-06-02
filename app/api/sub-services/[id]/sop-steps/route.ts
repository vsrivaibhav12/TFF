import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const sb = createClient();
    const { data, error } = await sb
      .from('sub_service_sop_steps')
      .select('id, step_order, title, description, is_required')
      .eq('sub_service_id', params.id)
      .eq('is_deleted', false)
      .order('step_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 });
  }
}
