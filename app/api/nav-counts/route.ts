import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/require-role';
import { getPendingApprovals } from '@/lib/repositories/dashboard';

export const dynamic = 'force-dynamic';

/**
 * Small counts for sidebar badges. RLS decides what the caller can see, so a team
 * member without approval rights simply gets zero.
 */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ approvals: 0 }, { status: 401 });
  try {
    const { total } = await getPendingApprovals();
    return NextResponse.json({ approvals: total });
  } catch {
    return NextResponse.json({ approvals: 0 });
  }
}
