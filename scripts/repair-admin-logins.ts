/**
 * Repair the two super-admin accounts so they can log in reliably.
 *
 * Reads current passwords from .env.local and ensures:
 *   - auth password matches .env.local
 *   - email is confirmed
 *   - user_metadata contains role = admin
 *   - users_profile row is active, role = admin
 *
 * If .env.local does not have SUPER_ADMIN_*_PASSWORD, set them first,
 * or run this with NEW_ADMIN_PASSWORD=... to set both to the same value.
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const ADMINS = [
  { email: 'mithuna@svmd.in', envVar: 'SUPER_ADMIN_MITHUNA_PASSWORD', fullName: 'Mithuna' },
  { email: 'vaibhav@svmd.in', envVar: 'SUPER_ADMIN_VAIBHAV_PASSWORD', fullName: 'Vaibhav' },
];

function generatePassword(length = 24): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%^&*';
  const all = upper + lower + digits + special;
  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function main() {
  if (!URL || !SERVICE_KEY || !ANON) {
    console.error('Missing Supabase env vars in .env.local');
    process.exit(1);
  }

  const sr = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const newSharedPassword = process.env.NEW_ADMIN_PASSWORD;

  for (const admin of ADMINS) {
    let password = process.env[admin.envVar];

    if (newSharedPassword) {
      password = newSharedPassword;
      console.log(`\n[${admin.email}] Using NEW_ADMIN_PASSWORD from environment`);
    } else if (!password) {
      console.log(`\n[${admin.email}] ${admin.envVar} not set in .env.local — generating a random password`);
      password = generatePassword();
      console.log(`  Generated: ${password}`);
      console.log(`  Add this to .env.local: ${admin.envVar}=${password}`);
    }

    // Find auth user
    const { data: list, error: listErr } = await sr.auth.admin.listUsers({ perPage: 200, page: 1 });
    if (listErr) {
      console.error(`  ERROR listing users: ${listErr.message}`);
      continue;
    }
    let authUser = (list?.users ?? []).find((u: any) => (u.email ?? '').toLowerCase() === admin.email.toLowerCase());

    if (!authUser) {
      console.log(`  auth user not found — creating`);
      const { data: created, error: createErr } = await sr.auth.admin.createUser({
        email: admin.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: admin.fullName, role: 'admin' },
      });
      if (createErr) {
        console.error(`  ERROR creating user: ${createErr.message}`);
        continue;
      }
      authUser = created?.user as any;
    } else {
      console.log(`  auth user found: ${authUser.id}`);
      const { error: updateErr } = await sr.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: admin.fullName, role: 'admin' },
      });
      if (updateErr) {
        console.error(`  ERROR updating user: ${updateErr.message}`);
        continue;
      }
      console.log(`  password updated, email confirmed, metadata set`);
    }

    // Ensure profile
    const { data: profile } = await sr.from('users_profile')
      .select('id, is_active, is_deleted, role')
      .eq('email', admin.email)
      .maybeSingle();

    if (!profile) {
      console.log(`  profile not found — creating`);
      const { error: profileErr } = await sr.from('users_profile').insert({
        id: authUser!.id,
        email: admin.email,
        full_name: admin.fullName,
        role: 'admin',
        is_active: true,
        is_deleted: false,
        is_prime_admin: true,
        job_title: 'Partner',
        department: 'Management',
      });
      if (profileErr) console.error(`  ERROR creating profile: ${profileErr.message}`);
      else console.log(`  profile created`);
    } else {
      const { error: updErr } = await sr.from('users_profile')
        .update({ is_active: true, is_deleted: false, role: 'admin', is_prime_admin: true, full_name: admin.fullName })
        .eq('email', admin.email);
      if (updErr) console.error(`  ERROR updating profile: ${updErr.message}`);
      else console.log(`  profile repaired`);
    }

    // Verify sign-in
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const { error: signInErr } = await anon.auth.signInWithPassword({ email: admin.email, password });
    if (signInErr) {
      console.error(`  SIGN-IN TEST FAILED: ${signInErr.message}`);
    } else {
      console.log(`  SIGN-IN TEST OK`);
    }
  }

  if (!newSharedPassword) {
    console.log('\nTip: If you want both admins to share one password, run:');
    console.log('  NEW_ADMIN_PASSWORD=YourStrongPass npx tsx scripts/repair-admin-logins.ts');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
