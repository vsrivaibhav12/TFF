import { NextRequest, NextResponse } from 'next/server';
import { listTaskTemplates } from '@/lib/repositories/task-templates';
import { requireRole } from '@/lib/auth/require-role';
import { rateLimitByUser } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const me = await requireRole(['admin', 'team']);
  const rl = rateLimitByUser(me.id, 'api:task-templates', { maxRequests: 60, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const subServiceId = request.nextUrl.searchParams.get('sub_service_id');
  if (!subServiceId) {
    return NextResponse.json({ error: 'sub_service_id is required' }, { status: 400 });
  }
  try {
    const templates = await listTaskTemplates(subServiceId);
    return NextResponse.json({ items: templates });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 });
  }
}
