/**
 * Emergency password rotation for the super-admin accounts.
 *
 * Reads new passwords from environment variables, or generates random
 * secure passwords if none are provided. Prints the new credentials to
 * stdout so they can be stored in a password manager.
 *
 * Required env vars (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional env vars:
 *   SUPER_ADMIN_MITHUNA_PASSWORD
 *   SUPER_ADMIN_VAIBHAV_PASSWORD
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SUPER_ADMINS = [
  { email: 'mithuna@svmd.in', envVar: 'SUPER_ADMIN_MITHUNA_PASSWORD' },
  { email: 'vaibhav@svmd.in', envVar: 'SUPER_ADMIN_VAIBHAV_PASSWORD' },
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
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

async function main() {
  if (!SB_URL || !SB_SERVICE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sb = createClient(SB_URL, SB_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: { email: string; password: string; status: string }[] = [];

  for (const admin of SUPER_ADMINS) {
    const newPassword = process.env[admin.envVar] || generatePassword();

    const { data: list } = await sb.auth.admin.listUsers({ perPage: 200, page: 1 });
    const existing = (list?.users ?? []).find(
      (u: any) => (u.email ?? '').toLowerCase() === admin.email.toLowerCase()
    );

    if (!existing) {
      results.push({ email: admin.email, password: newPassword, status: 'NOT_FOUND' });
      continue;
    }

    const { error } = await sb.auth.admin.updateUserById(existing.id, {
      password: newPassword,
    });

    if (error) {
      results.push({ email: admin.email, password: newPassword, status: `ERROR: ${error.message}` });
    } else {
      results.push({ email: admin.email, password: newPassword, status: 'ROTATED' });
    }
  }

  console.log('\n[rotate-super-admins] Results:');
  for (const r of results) {
    console.log(`\nEmail:    ${r.email}`);
    console.log(`Password: ${r.password}`);
    console.log(`Status:   ${r.status}`);
  }
  console.log('\nStore these credentials securely. The previous passwords are now invalid.');
}

main().catch((e) => {
  console.error('[rotate-super-admins] FATAL', e?.message ?? e);
  process.exit(1);
});
