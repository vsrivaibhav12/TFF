'use server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/auth/require-role';
import { rateLimitByUser } from '@/lib/rate-limit';
import { validatePassword } from '@/lib/auth/password-policy';
import { writeAudit } from '@/lib/services/audit-service';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

export async function sendPasswordResetAction(email: string): Promise<ActionResult<void>> {
  try {
    const address = String(email ?? '').trim().toLowerCase();
    if (!address || !address.includes('@')) return fail('Enter a valid email address', 'VALIDATION');

    // Limit per address and per caller IP so the form cannot be used to spam inboxes.
    const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const byEmail = await rateLimitByUser(address, 'auth:password-reset', { maxRequests: 3, windowMs: 300_000 });
    const byIp = await rateLimitByUser(ip, 'auth:password-reset-ip', { maxRequests: 10, windowMs: 300_000 });
    if (!byEmail.allowed || !byIp.allowed) return fail('Too many requests. Please try again later.', 'RATE_LIMITED');

    const sb = createClient();
    const { error } = await sb.auth.resetPasswordForEmail(address, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/login/reset`,
    });
    // Do not reveal whether the account exists or why sending failed.
    if (error) console.error('[sendPasswordResetAction]', error.message);
    return ok(undefined);
  } catch (e: unknown) {
    console.error('[sendPasswordResetAction]', e);
    return fail('Could not send the reset email. Please try again later.', 'UNKNOWN');
  }
}

export async function updateTeamMemberCredentialsAction(input: {
  user_id: string;
  email?: string;
  password?: string;
}): Promise<ActionResult<void>> {
  try {
    const me = await requireRole('admin');
    const sb = createServiceClient();

    // Only the prime admin may change another admin's sign-in details.
    const db = createClient();
    const { data: target } = await db
      .from('users_profile')
      .select('id, role, is_prime_admin')
      .eq('id', input.user_id)
      .maybeSingle();
    if (!target) return fail('User not found', 'NOT_FOUND');
    if (target.id !== me.id && target.role === 'admin' && !me.is_prime_admin) {
      return fail('Only the prime admin can change another admin’s sign-in details', 'FORBIDDEN');
    }
    if (target.is_prime_admin && target.id !== me.id) {
      return fail('The prime admin’s sign-in details can only be changed by that person', 'FORBIDDEN');
    }

    const updates: { email?: string; password?: string } = {};
    if (input.email && input.email.includes('@')) updates.email = input.email.trim().toLowerCase();
    if (input.password) {
      const problem = validatePassword(input.password);
      if (problem) return fail(problem, 'VALIDATION');
      updates.password = input.password;
    }
    if (Object.keys(updates).length === 0) return fail('Nothing to update', 'VALIDATION');

    const { error } = await sb.auth.admin.updateUserById(input.user_id, updates);
    if (error) return fail('Could not update this user’s sign-in details', 'AUTH');

    // Also update users_profile email if changed
    if (updates.email) {
      await db.from('users_profile').update({ email: updates.email }).eq('id', input.user_id);
    }

    // Never write the password itself to the audit log.
    await writeAudit({
      action: 'team.credentials_update',
      entity_type: 'user',
      entity_id: input.user_id,
      performed_by: me.id,
      details: { email_changed: !!updates.email, password_changed: !!updates.password },
    });

    return ok(undefined);
  } catch (e: unknown) {
    console.error('[updateTeamMemberCredentialsAction]', e);
    return fail('Something went wrong. Please try again.', (e as { code?: string })?.code ?? 'UNKNOWN');
  }
}
