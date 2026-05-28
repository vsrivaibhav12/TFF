'use server';
import { requireRole } from './require-role';
import { requireCapability } from './require-capability';
import type { Capability } from './capabilities';

/**
 * Use on pages that should be reachable by admin OR by team members
 * who hold a specific capability.
 *
 * Example:
 *   const me = await requireAdminOrCapability('dsc.manage');
 */
export async function requireAdminOrCapability(cap: Capability) {
  const me = await requireRole(['admin', 'team']);
  if (me.role === 'admin') return me;
  await requireCapability(me, cap);
  return me;
}
