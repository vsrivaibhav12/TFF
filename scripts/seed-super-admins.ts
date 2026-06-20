/**
 * Seed script: Reset all users, keep only Mithuna and Vaibhav as prime admins.
 *
 * Usage:
 *   npx tsx scripts/seed-super-admins.ts
 *
 * Environment (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPER_ADMIN_MITHUNA_PASSWORD
 *   SUPER_ADMIN_VAIBHAV_PASSWORD
 *
 * ⚠️  Never commit passwords to git. Use .env.local (gitignored).
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface SuperAdmin {
  email: string;
  envVar: string;
  full_name: string;
}

const SUPER_ADMINS: SuperAdmin[] = [
  { email: 'mithuna@svmd.in', envVar: 'SUPER_ADMIN_MITHUNA_PASSWORD', full_name: 'Mithuna' },
  { email: 'vaibhav@svmd.in', envVar: 'SUPER_ADMIN_VAIBHAV_PASSWORD', full_name: 'Vaibhav' },
];

async function main() {
  if (!SB_URL || !SB_SERVICE_KEY) {
    console.error('Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const missingPasswords = SUPER_ADMINS.filter((sa) => !process.env[sa.envVar]);
  if (missingPasswords.length) {
    console.error(
      `Missing passwords for: ${missingPasswords.map((sa) => sa.envVar).join(', ')}. Set them in .env.local.`
    );
    process.exit(1);
  }

  const sb = createClient(SB_URL, SB_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. List all auth users (paginated)
  const allAuthUsers: { id: string; email?: string }[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    if (!data.users.length) break;
    allAuthUsers.push(...data.users.map((u: any) => ({ id: u.id, email: u.email })));
    if (data.users.length < 100) break;
    page++;
  }

  console.log(`Found ${allAuthUsers.length} auth users`);

  // 2. For each user that's not a super admin target, deactivate and attempt delete
  const keepEmails = new Set(SUPER_ADMINS.map((s) => s.email.toLowerCase()));
  for (const u of allAuthUsers) {
    const email = (u.email ?? '').toLowerCase();
    if (keepEmails.has(email)) {
      console.log(`  Keeping ${email}`);
      continue;
    }
    console.log(`  Removing ${email || u.id}`);
    await sb.from('users_profile').update({ is_active: false, is_deleted: true }).eq('id', u.id);
    const { error: delErr } = await sb.auth.admin.deleteUser(u.id);
    if (delErr) {
      console.log(`    Auth delete failed (FKs likely remain): ${delErr.message}`);
    }
  }

  // 3. Ensure super admins exist
  for (const sa of SUPER_ADMINS) {
    const password = process.env[sa.envVar]!;
    const existing = allAuthUsers.find(
      (u: any) => (u.email ?? '').toLowerCase() === sa.email.toLowerCase()
    );

    let userId: string;
    if (existing) {
      userId = existing.id;
      console.log(`Updating ${sa.email} password and profile`);
      await sb.auth.admin.updateUserById(userId, { password, email_confirm: true });
    } else {
      console.log(`Creating ${sa.email}`);
      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email: sa.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: sa.full_name, role: 'admin' },
      });
      if (createErr || !created?.user) {
        console.error(`Failed to create ${sa.email}: ${createErr?.message}`);
        continue;
      }
      userId = created.user.id;
    }

    const { error: upsertErr } = await sb.from('users_profile').upsert(
      {
        id: userId,
        email: sa.email,
        full_name: sa.full_name,
        role: 'admin',
        is_active: true,
        is_deleted: false,
        is_prime_admin: true,
        job_title: 'Partner',
        department: 'Management',
      },
      { onConflict: 'id' }
    );
    if (upsertErr) {
      console.error(`Failed to upsert profile for ${sa.email}: ${upsertErr.message}`);
    }
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
