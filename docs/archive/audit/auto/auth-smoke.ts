import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { realtime: { transport: ws as any } });
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL || 'info@fiscalfulcrum.in';
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD!;
const TEAM_EMAIL = 'team.demo@fiscalfulcrum.in';
const TEAM_PASSWORD = process.env.TEAM_SEED_PASSWORD!;
const CLIENT_EMAIL = 'client.demo@fiscalfulcrum.in';
const CLIENT_PASSWORD = process.env.CLIENT_SEED_PASSWORD!;

async function main() {
  if (!ADMIN_PASSWORD || !TEAM_PASSWORD || !CLIENT_PASSWORD) {
    console.error('Missing seed password env vars. Set ADMIN_SEED_PASSWORD, TEAM_SEED_PASSWORD, CLIENT_SEED_PASSWORD in .env.local');
    process.exit(1);
  }
  // count users
  const { data: users, error: ue } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (ue) { console.error('listUsers err', ue); process.exit(1); }
  console.log(`Auth users: ${users.users.length}`);
  for (const u of users.users.slice(0, 10)) console.log(`  - ${u.email} (${u.id.slice(0,8)})`);
  // can we read users_profile?
  const { data: profs, error: pe } = await sb.from('users_profile').select('id, full_name, role').limit(10);
  console.log(`\nusers_profile rows: ${profs?.length ?? 0}${pe ? ' err='+pe.message : ''}`);
  for (const p of profs ?? []) console.log(`  - ${(p as any).full_name} (${(p as any).role})`);
  // try login with admin creds
  const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { realtime: { transport: ws as any } });
  const { data: sess, error: se } = await sbAnon.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  console.log(`\nAdmin login: ${se ? 'FAIL: '+se.message : 'OK token='+sess.session?.access_token.slice(0,20)+'...'}`);
  // try team login
  const { data: ts, error: te } = await sbAnon.auth.signInWithPassword({ email: TEAM_EMAIL, password: TEAM_PASSWORD });
  console.log(`Team login: ${te ? 'FAIL: '+te.message : 'OK'}`);
  // try client login
  const { data: cs, error: ce } = await sbAnon.auth.signInWithPassword({ email: CLIENT_EMAIL, password: CLIENT_PASSWORD });
  console.log(`Client login: ${ce ? 'FAIL: '+ce.message : 'OK'}`);

  // sanity: query real tables
  const { error: qrErr } = await sb.from('query_messages').select('id').limit(1);
  console.log(`\nquery_messages select: ${qrErr ? 'FAIL: '+qrErr.message : 'OK'}`);
  const { error: dscErr } = await sb.from('dsc_records').select('id').limit(1);
  console.log(`dsc_records select: ${dscErr ? 'FAIL: '+dscErr.message : 'OK'}`);
}
main().catch(e => { console.error(e); process.exit(1); });
