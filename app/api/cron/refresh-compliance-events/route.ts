import { NextResponse, type NextRequest } from 'next/server';
import { refreshComplianceEvents, refreshServiceDrivenComplianceEvents } from '@/lib/services/compliance-calendar-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Nightly refresh of compliance_calendar_events.
 * Authenticated via CRON_SECRET query param or x-vercel-cron header.
 * Local dev: ?secret=CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') ?? req.headers.get('x-cron-secret');
  const vercelCron = req.headers.get('x-vercel-cron');

  const isAuthorized =
    (vercelCron === '1' && secret === process.env.CRON_SECRET) ||
    secret === process.env.CRON_SECRET;

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
