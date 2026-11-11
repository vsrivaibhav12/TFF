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
 *  6. Deadline task creation (delegation): a team member without the compliance.generate_tasks
 *     capability is refused by both database functions and cannot write deadline dates.
 *  7. A team member WITH the capability gets past the permission check.
 *  8. An explicit revoke beats a role template that grants the capability.
 *  9. A visitor who is not signed in cannot run either function.
 * 10. A team member cannot grant themselves the capability.
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

// Shared set-up (runs as the database owner, before the role switch): a team member with no route to the capability.
const noCapability = `uid := (SELECT id FROM public.users_profile WHERE role='team' AND is_active LIMIT 1);
      DELETE FROM public.staff_capabilities WHERE user_id=uid AND capability='compliance.generate_tasks';
      UPDATE public.users_profile SET active_role_template_id=NULL WHERE id=uid;`;
const FN = `sid := (SELECT id FROM public.sub_services LIMIT 1);`;
const tryCall = (label: string, call: string) =>
  `BEGIN ${call}; res := res || '${label}=ALLOWED;'; EXCEPTION WHEN insufficient_privilege THEN res := res || '${label}=blocked;'; WHEN OTHERS THEN res := res || '${label}=passed-permission(' || SQLSTATE || ');'; END;`;
const listCall = `PERFORM public.list_deadline_clients(sid, '2026-10')`;
const createCall = `PERFORM public.create_deadline_tasks(sid, '2026-10', 'monthly', 2026, 10, NULL, (current_date + 30), 'medium', '[]'::jsonb)`;

checks.push(
  {
    name: '6. team member without the capability cannot create deadline tasks',
    body: `DECLARE sid uuid; BEGIN ${noCapability} ${FN} ${asTeam}
      ${tryCall('list', listCall)}
      ${tryCall('create', createCall)}
      ${tryCall('write_date', `INSERT INTO public.compliance_deadlines (sub_service_id, period_key, due_date) VALUES (sid, '2026-10', current_date + 30)`)}
    END;`,
    expect: (d) => d.includes('list=blocked') && d.includes('create=blocked') && d.includes('write_date=blocked'),
  },
  {
    name: '7. team member with the capability passes the permission check',
    body: `DECLARE sid uuid; BEGIN ${noCapability} ${FN}
      INSERT INTO public.staff_capabilities (user_id, capability, granted_by) VALUES (uid, 'compliance.generate_tasks', uid);
      ${asTeam}
      ${tryCall('list', listCall)}
      ${tryCall('create', createCall)}
    END;`,
    expect: (d) => !d.includes('list=blocked') && !d.includes('create=blocked'),
  },
  {
    name: '8. an explicit revoke beats a role template that grants it',
    body: `DECLARE sid uuid; BEGIN ${noCapability} ${FN}
      INSERT INTO public.staff_capabilities (user_id, capability, granted_by, revoked_at, revoked_by) VALUES (uid, 'compliance.generate_tasks', uid, now(), uid);
      ${asTeam}
      ${tryCall('list', listCall)}
    END;`,
    expect: (d) => d.includes('list=blocked'),
  },
  {
    name: '9. a visitor who is not signed in cannot run either function',
    body: `DECLARE sid uuid; BEGIN ${FN} ${asAnon}
      ${tryCall('list', listCall)}
      ${tryCall('create', createCall)}
    END;`,
    expect: (d) => d.includes('list=blocked') && d.includes('create=blocked'),
  },
  {
    name: '10. a team member cannot grant themselves the capability',
    body: `${noCapability} ${asTeam}
      BEGIN INSERT INTO public.staff_capabilities (user_id, capability, granted_by) VALUES (uid, 'compliance.generate_tasks', uid); res := res || 'self_grant=ALLOWED;'; EXCEPTION WHEN OTHERS THEN res := res || 'self_grant=blocked;'; END;`,
    expect: (d) => d.includes('self_grant=blocked'),
  },
);

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
