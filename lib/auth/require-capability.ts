import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ServiceError } from '@/lib/actions/result';
import type { AppUser } from '@/lib/auth/require-role';
import { type Capability } from '@/lib/auth/capabilities';
import { getCachedCapabilities } from '@/lib/auth/capabilities-cache';

/**
 * Returns true if the user has the capability (or any capability in the array).
 * Admin implicitly passes. Team users are resolved against the per-request cached
 * effective capability set to avoid repeated DB round trips.
 */
export async function hasCapability(user: AppUser, capability: Capability | Capability[]): Promise<boolean> {
  if (user.role === 'admin') return true;

  const wanted = Array.isArray(capability) ? capability : [capability];
  if (wanted.length === 0) return true;

  const effective = await getCachedCapabilities(user.id);
  return wanted.some((cap) => effective.has(cap));
}

export async function requireCapability(user: AppUser, capability: Capability | Capability[]): Promise<void> {
  const ok = await hasCapability(user, capability);
  if (!ok) {
    const label = Array.isArray(capability) ? capability.join(' or ') : capability;
    throw new ServiceError(`Missing capability: ${label}`, 'NO_CAPABILITY');
  }
}

/**
 * Hard variant for use directly in pages (not actions): redirects to / if missing.
 */
export async function requireCapabilityOrRedirect(user: AppUser, capability: Capability | Capability[]) {
  if (!(await hasCapability(user, capability))) redirect(`/${user.role}`);
}

/**
 * Return the effective capability set for a user.
 * Delegates to the cache/repository for a single source of truth.
 */
export async function listEffectiveCapabilities(userId: string): Promise<Capability[]> {
  const effective = await getCachedCapabilities(userId);
  return [...effective];
}

/**
 * Legacy alias — returns effective capabilities.
 * Prefer listEffectiveCapabilities in new code.
 */
export async function listCapabilitiesForUser(userId: string): Promise<Capability[]> {
  return listEffectiveCapabilities(userId);
}
