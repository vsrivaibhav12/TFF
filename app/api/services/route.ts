import { NextResponse } from 'next/server';
import { listServices } from '@/lib/repositories/services';
import { getCurrentUser } from '@/lib/auth/require-role';

export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const items = await listServices();
    return NextResponse.json({ items }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
