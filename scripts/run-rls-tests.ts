/**
 * Row level security checks against the live database.
 *
 *   npm run db:rls-test
 *
 * Every check runs inside a transaction that is ALWAYS rolled back (the block ends in
 * a deliberate exception), so this never changes data. It uses the Supabase
 * Management API (SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF in .env.local).
 *
 * What it proves:
 *  1. A not-signed-in visitor cannot read clients, users or tasks.
 *  2. A team member cannot make themselves admin or prime admin.
 *  3. A team member cannot create a profile for someone else.
 *  4. A team member can still edit harmless fields on their own profile.
 *  5. Staff can read profiles; the profiles table is not readable anonymously.
 */
import 'dotenv/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) {
  console.error('SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN are required in .env.local');
  process.exit(1);
}

async function runRolledBack(name: string, body: string): Promise<{ ok: boolean; detail: string }> {
  const sql = `DO $$ DECLARE uid uuid; res text := ''; n bigint; BEGIN
    SELECT id INTO uid FROM public.users_profile WHERE role = 'team' AND is_active LIMIT 1;
    ${body}
    RAISE EXCEPTION 'RESULT|%', res;
  END $$;`;
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await r.text();
  const m = text.match(/RESULT\|([^"\\]*)/);
  return { ok: !!m, detail: m ? m[1].trim() : `unexpected response: ${text.slice(0, 200)}` };
}

const asTeam = `PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); SET LOCAL ROLE authenticated;`;
const asAnon = `PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true); SET LOCAL ROLE anon;`;

const checks: Array<{ name: string; body: string; expect: (d: string) => boolean }> = [
  {
    name: '1. anonymous visitor reads nothing',
    body: `${asAnon}
      BEGIN SELECT count(*) INTO n FROM public.clients; res := res || 'clients=' || n || ';'; EXCEPTION WHEN OTHERS THEN res := res || 'clients=blocked;'; END;
      BEGIN SELECT count(*) INTO n FROM public.users_profile; res := res || 'users=' || n || ';'; EXCEPTION WHEN OTHERS THEN res := res || 'users=blocked;'; END;
      BEGIN SELECT count(*) INTO n FROM public.tasks; res := res || 'tasks=' || n || ';'; EXCEPTION WHEN OTHERS THEN res := res || 'tasks=blocked;'; END;`,
    expect: (d) => /clients=(0|blocked)/.test(d) && /users=(0|blocked)/.test(d) && /tasks=(0|blocked)/.test(d),
  },
  {
    name: '2. team member cannot become admin or prime admin',
    body: `${asTeam}
      BEGIN UPDATE public.users_profile SET role='admin' WHERE id=uid; res := res || 'admin=ALLOWED;'; EXCEPTION WHEN OTHERS THEN res := res || 'admin=blocked;'; END;
      BEGIN UPDATE public.users_profile SET is_prime_admin=true WHERE id=uid; res := res || 'prime=ALLOWED;'; EXCEPTION WHEN OTHERS THEN res := res || 'prime=blocked;'; END;`,
    expect: (d) => d.includes('admin=blocked') && d.includes('prime=blocked'),
  },
  {
    name: '3. team member cannot create profiles',
    body: `${asTeam}
      BEGIN INSERT INTO public.users_profile (id, email, role, full_name, is_active) VALUES (gen_random_uuid(), 'rls-test@example.invalid', 'admin', 'x', true); res := res || 'insert=ALLOWED;'; EXCEPTION WHEN OTHERS THEN res := res || 'insert=blocked;'; END;`,
    expect: (d) => d.includes('insert=blocked'),
  },
  {
    name: '4. team member can edit harmless own fields',
    body: `${asTeam}
      BEGIN UPDATE public.users_profile SET phone_number = phone_number WHERE id=uid; res := res || 'self=allowed;'; EXCEPTION WHEN OTHERS THEN res := res || 'self=BLOCKED;'; END;`,
    expect: (d) => d.includes('self=allowed'),
  },
  {
    name: '5. staff can read profiles',
    body: `${asTeam}
      SELECT count(*) INTO n FROM public.users_profile; res := res || 'profiles=' || n || ';';`,
    expect: (d) => /profiles=[1-9]/.test(d),
  },
];

(async () => {
  let failed = 0;
  for (const c of checks) {
    const r = await runRolledBack(c.name, c.body);
    const pass = r.ok && c.expect(r.detail);
    if (!pass) failed++;
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${c.name}  (${r.detail})`);
  }
  console.log(failed === 0 ? '\nAll RLS checks passed.' : `\n${failed} RLS check(s) failed.`);
  process.exitCode = failed === 0 ? 0 : 1;
})();
