'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

const createSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().trim().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['team', 'admin']),
  job_title: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  phone_number: z.string().trim().optional().nullable(),
  manager_id: z.union([z.string().uuid(), z.literal(''), z.null()]).optional().transform(v => v && v !== '' ? v : null),
});

/**
 * Create a new internal user (team or admin). Admin-only.
 *
 * Flow:
 *  1. Create auth user via Supabase Auth admin API (service-role).
 *     - Admin assigns password directly; user can sign in immediately.
 *  2. Insert matching users_profile row (id = auth user id).
 *  3. Return the new user's id so the UI can route to their detail page.
 *
 * If the email already exists in auth, we surface a friendly error.
 */
export async function createTeamMemberAction(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult<{ user_id: string }>> {
  try {
    const me = await requireRole('admin');
    await requireCapability(me, 'staff.manage');
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    }
    const v = parsed.data;
    const sb = createServiceClient();

    // 1. Create auth user with admin-assigned password.
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: v.email,
      password: v.password,
      email_confirm: true,
      user_metadata: { full_name: v.full_name, role: v.role },
    });
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'Failed to create auth user';
      // Most common case: duplicate email
      if (/already.*registered|already.*exists/i.test(msg)) {
        return fail('A user with this email already exists', 'DUPLICATE');
      }
      return fail(msg, 'AUTH');
    }
    const authUserId = created.user.id;

    // 2. Upsert the profile (auth-trigger may have already created a row;
    //    in case not, this guarantees one exists with the right role).
    const { error: profErr } = await sb.from('users_profile').upsert({
      id: authUserId,
      full_name: v.full_name,
      email: v.email,
      role: v.role,
      job_title: v.job_title || null,
      department: v.department || null,
      phone_number: v.phone_number || null,
      reports_to: v.manager_id || null,
      is_active: true,
    }, { onConflict: 'id' });
    if (profErr) return fail(`Auth user created but profile upsert failed: ${profErr.message}`, 'DB');

    revalidatePath('/admin/team');
    return ok({ user_id: authUserId });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const toggleActiveSchema = z.object({
  user_id: z.string().uuid(),
  is_active: z.boolean(),
});

const updateManagerSchema = z.object({
  user_id: z.string().uuid(),
  manager_id: z.union([z.string().uuid(), z.literal(''), z.null()]).optional().transform(v => v && v !== '' ? v : null),
});

export async function updateTeamMemberManagerAction(
  input: z.infer<typeof updateManagerSchema>,
): Promise<ActionResult<void>> {
  try {
    const me = await requireRole('admin');
    await requireCapability(me, 'staff.manage');
    const parsed = updateManagerSchema.safeParse(input);
    if (!parsed.success) return fail('Invalid input', 'VALIDATION');
    const sb = createClient();
    const { error } = await sb
      .from('users_profile')
      .update({ reports_to: parsed.data.manager_id ?? null })
      .eq('id', parsed.data.user_id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/team');
    revalidatePath(`/admin/team/${parsed.data.user_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function toggleTeamMemberActiveAction(
  input: z.infer<typeof toggleActiveSchema>,
): Promise<ActionResult<void>> {
  try {
    const me = await requireRole('admin');
    await requireCapability(me, 'staff.manage');
    const parsed = toggleActiveSchema.safeParse(input);
    if (!parsed.success) return fail('Invalid input', 'VALIDATION');
    if (parsed.data.user_id === me.id) {
      return fail('You cannot deactivate your own account', 'SELF');
    }
    const sb = createClient();
    const { error } = await sb
      .from('users_profile')
      .update({ is_active: parsed.data.is_active })
      .eq('id', parsed.data.user_id);
    if (error) return fail(error.message, 'DB');
    revalidatePath('/admin/team');
    revalidatePath(`/admin/team/${parsed.data.user_id}`);
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

const removeSchema = z.object({
  user_id: z.string().uuid(),
});

/**
 * Permanently remove a team member. Admin-only.
 * - Cannot remove self.
 * - Cannot remove prime admins (Mithuna, Vaibhav).
 * - Soft-deletes profile (is_active=false, is_deleted=true).
 * - Cleans up config tables.
 * - Attempts auth user deletion (ignored if FKs block it).
 */
export async function removeTeamMemberAction(
  input: z.infer<typeof removeSchema>,
): Promise<ActionResult<void>> {
  try {
    const me = await requireRole('admin');
    await requireCapability(me, 'staff.manage');
    const parsed = removeSchema.safeParse(input);
    if (!parsed.success) return fail('Invalid input', 'VALIDATION');

    const targetId = parsed.data.user_id;
    if (targetId === me.id) {
      return fail('You cannot remove your own account', 'SELF');
    }

    const sb = createClient();
    const { data: profile } = await sb
      .from('users_profile')
      .select('is_prime_admin, email')
      .eq('id', targetId)
      .maybeSingle();

    if (!profile) return fail('User not found', 'NOT_FOUND');
    if ((profile as any).is_prime_admin) {
      return fail('Super admins cannot be removed', 'PROTECTED');
    }

    // 1. Clean up user-specific config tables (best-effort)
    await sb.from('staff_payroll_settings').delete().eq('user_id', targetId);
    await sb.from('staff_capabilities').delete().eq('user_id', targetId);
    await sb.from('team_client_assignment').delete().eq('team_user_id', targetId);
    await sb.from('notification_preferences').delete().eq('user_id', targetId);

    // 2. Nullify references where possible
    await sb.from('tasks').update({ assigned_to: null }).eq('assigned_to', targetId);
    await sb.from('tasks').update({ reviewer_id: null }).eq('reviewer_id', targetId);

    // 3. Soft-delete profile so they vanish from all listings and cannot log in
    await sb.from('users_profile')
      .update({ is_active: false, is_deleted: true, reports_to: null })
      .eq('id', targetId);

    // 4. Attempt auth deletion (may fail due to FKs on historical data; that's OK)
    try {
      const svc = createServiceClient();
      await svc.auth.admin.deleteUser(targetId);
    } catch {
      // Auth user may remain if historical data blocks cascade,
      // but profile is already deactivated so they cannot log in.
    }

    revalidatePath('/admin/team');
    return ok(undefined);
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
