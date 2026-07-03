import 'server-only';

import { cache } from 'react';
import { requireRole, type AppUser } from '@/lib/auth/require-role';
import { type Capability } from '@/lib/auth/capabilities';
import { listEffectiveCapabilities } from '@/lib/repositories/staff-capabilities';

/**
 * Cached per-request effective capability lookup.
 * Resolves the user's full capability set once per request and answers
 * multiple capability questions without repeated DB round trips.
 */
export const getCachedCapabilities = cache(async (userId: string): Promise<Set<Capability>> => {
  const caps = await listEffectiveCapabilities(userId);
  return new Set(caps);
});

/**
 * Returns the subset of requested capabilities the user actually holds.
 * Admin always receives the full requested set.
 */
export async function hasCapabilities(
  user: AppUser,
  capabilities: Capability | Capability[]
): Promise<Set<Capability>> {
  const wanted = Array.isArray(capabilities) ? capabilities : [capabilities];

  if (user.role === 'admin') {
    return new Set(wanted);
  }

  const effective = await getCachedCapabilities(user.id);
  return new Set(wanted.filter((cap) => effective.has(cap)));
}

/**
 * Returns true if the user has at least one of the requested capabilities.
 */
export async function hasAnyCapability(
  user: AppUser,
  capabilities: Capability | Capability[]
): Promise<boolean> {
  const caps = await hasCapabilities(user, capabilities);
  return caps.size > 0;
}

/**
 * Throws if the user lacks at least one of the requested capabilities.
 */
export async function requireCapabilities(
  user: AppUser,
  capabilities: Capability | Capability[]
): Promise<void> {
  const ok = await hasAnyCapability(user, capabilities);
  if (!ok) {
    const label = Array.isArray(capabilities) ? capabilities.join(' or ') : capabilities;
    const { ServiceError } = await import('@/lib/actions/result');
    throw new ServiceError(`Missing capability: ${label}`, 'NO_CAPABILITY');
  }
}

/**
 * Convenience helper that loads the current user and their cached capabilities.
 * Useful in server components that need to check several caps.
 */
export async function getCurrentUserWithCapabilities(): Promise<{
  user: AppUser;
  hasCapability: (cap: Capability) => Promise<boolean>;
}> {
  const user = await requireRole(['admin', 'team', 'client']);
  if (user.role === 'admin') {
    return {
      user,
      hasCapability: async () => true,
    };
  }

  const effective = await getCachedCapabilities(user.id);
  return {
    user,
    hasCapability: async (cap: Capability) => effective.has(cap),
  };
}
