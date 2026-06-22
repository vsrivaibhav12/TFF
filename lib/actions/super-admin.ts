'use server';

import { z } from 'zod';
import { createClient as _createClient } from '@supabase/supabase-js';
import { requireRole } from '@/lib/auth/require-role';
import { createServiceClient } from '@/lib/supabase/service-role';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

const SUPER_ADMINS = [
  { email: 'mithuna@svmd.in', fullName: 'Mithuna' },
  { email: 'vaibhav@svmd.in', fullName: 'Vaibhav' },
];

const updateSuperAdminPasswordSchema = z.object({
  email: z.enum(['mithuna@svmd.in', 'vaibhav@svmd.in']),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export async function updateSuperAdminPassword(
  input: z.infer<typeof updateSuperAdminPasswordSchema>
): Promise<ActionResult<{ password: string; email: string }>> {
  try {
    await requireRole('admin');

    const parsed = updateSuperAdminPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    }

    const { email, password } = parsed.data;
    const adminInfo = SUPER_ADMINS.find((a) => a.email === email)!;

    const sr = createServiceClient();

    const { data: list, error: listErr } = await sr.auth.admin.listUsers({ perPage: 200, page: 1 });
    if (listErr) {
      return fail(`Unable to load users: ${listErr.message}`, 'AUTH_ERROR');
    }

    const authUser = (list?.users ?? []).find(
      (u: any) => (u.email ?? '').toLowerCase() === email.toLowerCase()
    );

    if (!authUser) {
      // Create the account if it is missing
      const { data: created, error: createErr } = await sr.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: adminInfo.fullName, role: 'admin' },
      });
      if (createErr) {
        return fail(`Unable to create account: ${createErr.message}`, 'AUTH_ERROR');
      }

      await ensureProfile(sr, created.user!.id, email, adminInfo.fullName);
    } else {
      const { error: updateErr } = await sr.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: adminInfo.fullName, role: 'admin' },
      });
      if (updateErr) {
        return fail(`Unable to update password: ${updateErr.message}`, 'AUTH_ERROR');
      }

      await ensureProfile(sr, authUser.id, email, adminInfo.fullName);
    }

    // Verify the new password works with the anon client
    const anon = _createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
    const { error: signInErr } = await anon.auth.signInWithPassword({ email, password });
    if (signInErr) {
      return fail(`Password was saved but sign-in test failed: ${signInErr.message}`, 'AUTH_ERROR');
    }

    return ok({ password, email });
  } catch (e: any) {
    return fail(e?.message ?? 'Something went wrong', e?.code ?? 'UNKNOWN');
  }
}

async function ensureProfile(
  sr: ReturnType<typeof createServiceClient>,
  userId: string,
  email: string,
  fullName: string
) {
  const { data: profile } = await sr
    .from('users_profile')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!profile) {
    await sr.from('users_profile').insert({
      id: userId,
      email,
      full_name: fullName,
      role: 'admin',
      is_active: true,
      is_deleted: false,
      is_prime_admin: true,
      job_title: 'Partner',
      department: 'Management',
    });
  } else {
    await sr
      .from('users_profile')
      .update({
        is_active: true,
        is_deleted: false,
        role: 'admin',
        is_prime_admin: true,
        full_name: fullName,
      })
      .eq('email', email);
  }
}
