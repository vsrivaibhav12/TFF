'use server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/auth/require-role';
import { rateLimitByUser } from '@/lib/rate-limit';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

export async function sendPasswordResetAction(email: string): Promise<ActionResult<void>> {
  try {
    const rl = rateLimitByUser(email, 'auth:password-reset', { maxRequests: 3, windowMs: 300_000 });
    if (!rl.allowed) return fail('Too many requests. Please try again later.', 'RATE_LIMITED');
    const sb = createClient();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/login/reset`,
    });
    if (error) return fail(error.message, 'AUTH');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function updateTeamMemberCredentialsAction(input: {
  user_id: string;
  email?: string;
  password?: string;
}): Promise<ActionResult<void>> {
  try {
    await requireRole('admin');
    const sb = createServiceClient();
    const updates: { email?: string; password?: string } = {};
    if (input.email && input.email.includes('@')) updates.email = input.email.trim();
    if (input.password && input.password.length >= 6) updates.password = input.password;
    if (Object.keys(updates).length === 0) return fail('Nothing to update', 'VALIDATION');

    const { error } = await sb.auth.admin.updateUserById(input.user_id, updates);
    if (error) return fail(error.message, 'AUTH');

    // Also update users_profile email if changed
    if (updates.email) {
      const db = createClient();
      await db.from('users_profile').update({ email: updates.email }).eq('id', input.user_id);
    }

    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
