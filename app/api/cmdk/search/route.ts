import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import { createClient } from '@/lib/supabase/server';
import { rateLimitByUser } from '@/lib/rate-limit';
import { mergeById, wrapLike } from '@/lib/supabase/safe-search';

export const dynamic = 'force-dynamic';

const EMPTY = { clients: [], tasks: [], notices: [], queries: [], team: [], credentials: [] };

/**
 * v3 Cmd-K record search. Returns clients, tasks, notices, queries.
 * RLS enforces row visibility per role. Credentials additionally require
 * the `credentials.view` capability.
 */
export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json(EMPTY, { status: 401 });

  const rl = rateLimitByUser(me.id, 'api:cmdk', { maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const q = (new URL(req.url)).searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json(EMPTY);

  const sb = createClient();
  const like = wrapLike(q);
  const isAdminOrTeam = me.role === 'admin' || me.role === 'team';
  const canViewCredentials = isAdminOrTeam && (await hasCapability(me, 'credentials.view'));

  const [clientsRes, tasksRes, noticesRes, queriesRes] = await Promise.all([
    // Clients: search across business_name, gstin, pan and merge.
    (async () => {
      const [nameRes, gstinRes, panRes] = await Promise.all([
        sb.from('clients').select('id, business_name, gstin, pan').eq('is_deleted', false).ilike('business_name', like).limit(8),
        sb.from('clients').select('id, business_name, gstin, pan').eq('is_deleted', false).ilike('gstin', like).limit(8),
        sb.from('clients').select('id, business_name, gstin, pan').eq('is_deleted', false).ilike('pan', like).limit(8),
      ]);
      if (nameRes.error) throw nameRes.error;
      if (gstinRes.error) throw gstinRes.error;
      if (panRes.error) throw panRes.error;
      return mergeById([nameRes.data ?? [], gstinRes.data ?? [], panRes.data ?? []]).slice(0, 8);
    })(),

    sb.from('tasks')
      .select('id, title, status, clients(business_name), sub_services(name)')
      .eq('is_deleted', false)
      .ilike('title', like)
      .limit(8),

    // Notices: search subject and notice_type separately.
    (async () => {
      const [subjectRes, typeRes] = await Promise.all([
        sb.from('notices')
          .select('id, subject, notice_type, status, clients(business_name)')
          .eq('is_deleted', false)
          .ilike('subject', like)
          .limit(8),
        sb.from('notices')
          .select('id, subject, notice_type, status, clients(business_name)')
          .eq('is_deleted', false)
          .ilike('notice_type', like)
          .limit(8),
      ]);
      if (subjectRes.error) throw subjectRes.error;
      if (typeRes.error) throw typeRes.error;
      return mergeById([subjectRes.data ?? [], typeRes.data ?? []]).slice(0, 8);
    })(),

    sb.from('queries')
      .select('id, subject, status, client_id, clients(business_name)')
      .ilike('subject', like)
      .limit(8),
  ]);

  let team: any[] = [];
  let credentials: any[] = [];

  if (isAdminOrTeam) {
    const [teamRes] = await Promise.all([
      // Team: search full_name and email separately.
      (async () => {
        const [nameRes, emailRes] = await Promise.all([
          sb.from('users_profile').select('id, full_name, email, role').eq('is_active', true).ilike('full_name', like).limit(8),
          sb.from('users_profile').select('id, full_name, email, role').eq('is_active', true).ilike('email', like).limit(8),
        ]);
        if (nameRes.error) throw nameRes.error;
        if (emailRes.error) throw emailRes.error;
        return mergeById([nameRes.data ?? [], emailRes.data ?? []]).slice(0, 8);
      })(),
    ]);
    team = teamRes;

    if (canViewCredentials) {
      const credRes = await (async () => {
        const [nameRes, urlRes] = await Promise.all([
          sb.from('credentials')
            .select('id, portal_name, portal_url, client_id, clients(business_name)')
            .eq('is_deleted', false)
            .ilike('portal_name', like)
            .limit(8),
          sb.from('credentials')
            .select('id, portal_name, portal_url, client_id, clients(business_name)')
            .eq('is_deleted', false)
            .ilike('portal_url', like)
            .limit(8),
        ]);
        if (nameRes.error) throw nameRes.error;
        if (urlRes.error) throw urlRes.error;
        return mergeById([nameRes.data ?? [], urlRes.data ?? []]).slice(0, 8);
      })();
      credentials = credRes;
    }
  }

  if (tasksRes.error) throw tasksRes.error;
  if (queriesRes.error) throw queriesRes.error;

  return NextResponse.json({
    clients: clientsRes.map((c: any) => ({ ...c, client_name: c.clients?.business_name })),
    tasks: (tasksRes.data ?? []).map((t: any) => ({ ...t, client_name: t.clients?.business_name, sub_service_name: t.sub_services?.name })),
    notices: noticesRes.map((n: any) => ({ ...n, client_name: n.clients?.business_name })),
    queries: (queriesRes.data ?? []).map((q: any) => ({ ...q, client_name: q.clients?.business_name })),
    team,
    credentials: credentials.map((c: any) => ({ ...c, client_name: c.clients?.business_name })),
  });
}
