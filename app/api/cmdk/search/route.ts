import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { rateLimitByUser } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * v3 Cmd-K record search. Returns clients, tasks, notices.
 * RLS enforces row visibility per role.
 */
export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ clients: [], tasks: [], notices: [] }, { status: 401 });
  const rl = rateLimitByUser(me.id, 'api:cmdk', { maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const q = (new URL(req.url)).searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json({ clients: [], tasks: [], notices: [] });
  const sb = createClient();
  const like = `%${q}%`;

  const isAdminOrTeam = me.role === 'admin' || me.role === 'team';

  const promises: any[] = [
    sb.from('clients')
      .select('id, business_name, gstin, pan')
      .eq('is_deleted', false)
      .or(`business_name.ilike.${like},gstin.ilike.${like},pan.ilike.${like}`)
      .limit(8),
    sb.from('tasks')
      .select('id, title, status, clients(business_name)')
      .eq('is_deleted', false)
      .ilike('title', like)
      .limit(8),
    sb.from('notices')
      .select('id, subject, notice_type, status, clients(business_name)')
      .eq('is_deleted', false)
      .or(`subject.ilike.${like},notice_type.ilike.${like}`)
      .limit(8)
  ];

  if (isAdminOrTeam) {
    promises.push(
      sb.from('users_profile')
        .select('id, full_name, email, role')
        .eq('is_active', true)
        .or(`full_name.ilike.${like},email.ilike.${like}`)
        .limit(8)
    );
    promises.push(
      sb.from('credentials')
        .select('id, portal_name, portal_url, client_id, clients(business_name)')
        .eq('is_deleted', false)
        .or(`portal_name.ilike.${like},portal_url.ilike.${like}`)
        .limit(8)
    );
  }

  const results = await Promise.all(promises);
  
  const clients = results[0];
  const tasks = results[1];
  const notices = results[2];
  const team = isAdminOrTeam ? results[3] : { data: [] };
  const credentials = isAdminOrTeam ? results[4] : { data: [] };

  return NextResponse.json({
    clients: clients.data ?? [],
    tasks: (tasks.data ?? []).map((t: any) => ({ ...t, client_name: t.clients?.business_name })),
    notices: (notices.data ?? []).map((n: any) => ({ ...n, client_name: n.clients?.business_name })),
    team: team.data ?? [],
    credentials: (credentials.data ?? []).map((c: any) => ({ ...c, client_name: c.clients?.business_name })),
  });
}
