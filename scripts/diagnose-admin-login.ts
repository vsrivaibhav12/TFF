/**
 * Diagnose and repair login for the two super-admin accounts.
 *
 * Reads current passwords from .env.local, ensures:
 *   - auth user exists and is email-confirmed
 *   - password matches the env value
 *   - users_profile row is active, not deleted, role = admin
 *
 * Then attempts a real sign-in and reports success/failure.
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const ADMINS = [
  { email: 'mithuna@svmd.in', envVar: 'SUPER_ADMIN_MITHUNA_PASSWORD' },
  { email: 'vaibhav@svmd.in', envVar: 'SUPER_ADMIN_VAIBHAV_PASSWORD' },
];

async function main() {
  if (!URL || !SERVICE_KEY || !ANON) {
    console.error('Missing Supabase env vars in .env.local');
    process.exit(1);
  }

  const sr = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  for (const admin of ADMINS) {
    const password = process.env[admin.envVar];
    console.log(`\n--- ${admin.email} ---`);

    if (!password) {
      console.log(`  MISSING env var ${admin.envVar}`);
      continue;
    }
    if (password.length < 6) {
      console.log(`  env var ${admin.envVar} is too short (${password.length} chars)`);
      continue;
    }

    // Find auth user
    const { data: list, error: listErr } = await sr.auth.admin.listUsers({ perPage: 200, page: 1 });
    if (listErr) {
      console.log(`  ERROR listing users: ${listErr.message}`);
      continue;
    }
    const authUser = (list?.users ?? []).find((u: any) => (u.email ?? '').toLowerCase() === admin.email.toLowerCase());

    if (!authUser) {
      console.log(`  auth user NOT FOUND — creating with env password`);
      const { data: created, error: createErr } = await sr.auth.admin.createUser({
        email: admin.email,
        password,
        email_confirm: true,
      });
      if (createErr) {
        console.log(`  ERROR creating user: ${createErr.message}`);
        continue;
      }
      console.log(`  created auth user ${created?.user?.id}`);
    } else {
      console.log(`  auth user found: ${authUser.id}`);
      console.log(`  email_confirmed_at: ${(authUser as any).email_confirmed_at ?? 'null'}`);
      console.log(`  last_sign_in_at: ${(authUser as any).last_sign_in_at ?? 'never'}`);

      // Update password and confirm email
      const { error: updateErr } = await sr.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
      });
      if (updateErr) {
        console.log(`  ERROR updating user: ${updateErr.message}`);
        continue;
      }
      console.log(`  password updated and email confirmed`);
    }

    // Ensure profile is active and admin
    const { data: profile } = await sr.from('users_profile')
      .select('id, is_active, is_deleted, role')
      .eq('email', admin.email)
      .maybeSingle();

    if (!profile) {
      console.log(`  profile NOT FOUND — creating`);
      const { data: userRecord } = await sr.auth.admin.listUsers({ perPage: 200, page: 1 });
      const user = (userRecord?.users ?? []).find((u: any) => (u.email ?? '').toLowerCase() === admin.email.toLowerCase());
      if (user) {
        const { error: profileErr } = await sr.from('users_profile').insert({
          id: user.id,
          email: admin.email,
          full_name: admin.email === 'mithuna@svmd.in' ? 'Mithuna' : 'Vaibhav',
          role: 'admin',
          is_active: true,
          is_deleted: false,
          is_prime_admin: true,
          job_title: 'Partner',
          department: 'Management',
        });
        if (profileErr) console.log(`  ERROR creating profile: ${profileErr.message}`);
        else console.log(`  profile created`);
      }
    } else {
      console.log(`  profile found: role=${profile.role}, is_active=${profile.is_active}, is_deleted=${profile.is_deleted}`);
      if (!profile.is_active || profile.is_deleted || profile.role !== 'admin') {
        const { error: updProfileErr } = await sr.from('users_profile')
          .update({ is_active: true, is_deleted: false, role: 'admin', is_prime_admin: true })
          .eq('email', admin.email);
        if (updProfileErr) console.log(`  ERROR updating profile: ${updProfileErr.message}`);
        else console.log(`  profile repaired`);
      }
    }

    // Try a real sign-in
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({
      email: admin.email,
      password,
    });

    if (signInErr) {
      console.log(`  SIGN-IN FAILED: ${signInErr.message} (code: ${signInErr.code})`);
    } else {
      console.log(`  SIGN-IN OK: ${signInData.user?.id}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
