import { isAuthorizedCron } from '@/lib/auth/cron-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { refreshComplianceEvents, refreshServiceDrivenComplianceEvents } from '@/lib/services/compliance-calendar-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Nightly refresh of compliance_calendar_events.
 * Authenticated with `Authorization: Bearer <CRON_SECRET>` (what Vercel Cron sends).
 */
export async function GET(req: NextRequest) {
  const isAuthorized = isAuthorizedCron(req);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const [r1, r2] = await Promise.all([
      refreshComplianceEvents(),
      refreshServiceDrivenComplianceEvents(),
    ]);
    return NextResponse.json({ ok: true, rules: r1, services: r2 });
  } catch (e: any) {
    console.error('[cron/refresh-compliance-events]', e);
    return NextResponse.json({ ok: false, error: 'refresh_failed' }, { status: 500 });
  }
}
