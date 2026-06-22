/**
 * Rotate the two super-admin passwords, update Supabase Auth, and write the
 * new values directly to .env.local so scripts and manual login use the same
 * passwords.
 *
 * The password is NOT printed. Open .env.local to see/copy it.
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
import fs from 'fs';
loadEnv({ path: path.join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const ENV_PATH = path.join(process.cwd(), '.env.local');

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

function upsertEnvVar(content: string, key: string, value: string): string {
  const lines = content.split(/\r?\n/);
  const regex = new RegExp(`^${key}=.*$`);
  let found = false;
  const newLines = lines.map((line) => {
    if (regex.test(line)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) {
    newLines.push(`${key}=${value}`);
  }
  return newLines.join('\n');
}

async function main() {
  if (!URL || !SERVICE_KEY || !ANON) {
    console.error('Missing Supabase env vars in .env.local');
    process.exit(1);
  }

  if (!fs.existsSync(ENV_PATH)) {
    console.error('.env.local not found at', ENV_PATH);
    process.exit(1);
  }

  const sr = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  let envContent = fs.readFileSync(ENV_PATH, 'utf-8');

  for (const admin of ADMINS) {
    const password = generatePassword();
    console.log(`\n[${admin.email}] Rotating password...`);

    // Update Supabase Auth
    const { data: list, error: listErr } = await sr.auth.admin.listUsers({ perPage: 200, page: 1 });
    if (listErr) {
      console.error(`  ERROR listing users: ${listErr.message}`);
      continue;
    }
    const authUser = (list?.users ?? []).find((u: any) => (u.email ?? '').toLowerCase() === admin.email.toLowerCase());

    if (!authUser) {
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
      console.log(`  created auth user ${created?.user?.id}`);
    } else {
      const { error: updateErr } = await sr.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: admin.fullName, role: 'admin' },
      });
      if (updateErr) {
        console.error(`  ERROR updating user: ${updateErr.message}`);
        continue;
      }
      console.log(`  password rotated`);
    }

    // Ensure profile active/admin
    const { data: profile } = await sr.from('users_profile')
      .select('id, is_active, is_deleted, role')
      .eq('email', admin.email)
      .maybeSingle();

    if (!profile) {
      const { data: userRecord } = await sr.auth.admin.listUsers({ perPage: 200, page: 1 });
      const user = (userRecord?.users ?? []).find((u: any) => (u.email ?? '').toLowerCase() === admin.email.toLowerCase());
      if (user) {
        await sr.from('users_profile').insert({
          id: user.id,
          email: admin.email,
          full_name: admin.fullName,
          role: 'admin',
          is_active: true,
          is_deleted: false,
          is_prime_admin: true,
          job_title: 'Partner',
          department: 'Management',
        });
      }
    } else {
      await sr.from('users_profile')
        .update({ is_active: true, is_deleted: false, role: 'admin', is_prime_admin: true, full_name: admin.fullName })
        .eq('email', admin.email);
    }

    // Verify sign-in
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const { error: signInErr } = await anon.auth.signInWithPassword({ email: admin.email, password });
    if (signInErr) {
      console.error(`  SIGN-IN TEST FAILED: ${signInErr.message}`);
    } else {
      console.log(`  sign-in test OK`);
    }

    // Save to .env.local
    envContent = upsertEnvVar(envContent, admin.envVar, password);
  }

  fs.writeFileSync(ENV_PATH, envContent);
  console.log('\n.env.local updated with new admin passwords.');
  console.log('Open .env.local and copy SUPER_ADMIN_MITHUNA_PASSWORD / SUPER_ADMIN_VAIBHAV_PASSWORD when logging in.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
