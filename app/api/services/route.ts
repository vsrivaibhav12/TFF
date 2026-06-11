import { NextResponse } from 'next/server';
import { listServices } from '@/lib/repositories/services';
import { requireRole } from '@/lib/auth/require-role';
import { rateLimitByUser } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await requireRole(['admin', 'team']);
  const rl = rateLimitByUser(me.id, 'api:services', { maxRequests: 60, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  try {
    const items = await listServices();
    return NextResponse.json({ items }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
