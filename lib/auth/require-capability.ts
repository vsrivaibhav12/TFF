import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ServiceError } from '@/lib/actions/result';
import type { AppUser } from '@/lib/auth/require-role';
import { type Capability } from '@/lib/auth/capabilities';
import { listEffectiveCapabilities as repoListEffectiveCapabilities } from '@/lib/repositories/staff-capabilities';

/**
 * Returns true if the user has the capability.
 * Resolution order (team users only; admin implicitly has all):
 *  1. Explicit deviation in staff_capabilities (not revoked) → ALLOW
 *  2. Explicit revocation in staff_capabilities (revoked_at set) → DENY
 *  3. Active role template has the capability → ALLOW
 *  4. Otherwise → DENY
 */
export async function hasCapability(user: AppUser, capability: Capability): Promise<boolean> {
  if (user.role === 'admin') return true;
  const sb = createClient();

  // 1. Check explicit deviation (grant or revoke)
  const { data: deviation } = await sb
    .from('staff_capabilities')
    .select('revoked_at')
    .eq('user_id', user.id)
    .eq('capability', capability)
    .maybeSingle();

  if (deviation) {
    return deviation.revoked_at === null; // granted if not revoked
  }

  // 2. Fallback to active role template
  const { data: profile } = await sb
    .from('users_profile')
    .select('active_role_template_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.active_role_template_id) return false;

  const { data: templateCap } = await sb
    .from('staff_role_template_capabilities')
    .select('id')
    .eq('template_id', profile.active_role_template_id)
    .eq('capability', capability)
    .maybeSingle();

  return !!templateCap;
}

export async function requireCapability(user: AppUser, capability: Capability): Promise<void> {
  const ok = await hasCapability(user, capability);
  if (!ok) {
    throw new ServiceError(`Missing capability: ${capability}`, 'NO_CAPABILITY');
  }
}

/**
 * Hard variant for use directly in pages (not actions): redirects to / if missing.
 */
export async function requireCapabilityOrRedirect(user: AppUser, capability: Capability) {
  if (!(await hasCapability(user, capability))) redirect(`/${user.role}`);
}

/**
 * Return the effective capability set for a user.
 * Merges active role template capabilities with explicit deviations.
 * Delegates to the repository for a single source of truth.
 */
export async function listEffectiveCapabilities(userId: string): Promise<Capability[]> {
  return repoListEffectiveCapabilities(userId);
}

/**
 * Legacy alias — returns effective capabilities.
 * Prefer listEffectiveCapabilities in new code.
 */
export async function listCapabilitiesForUser(userId: string): Promise<Capability[]> {
  return repoListEffectiveCapabilities(userId);
}
