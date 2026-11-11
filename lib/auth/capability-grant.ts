// Not marked server-only so client components can use it to show a locked toggle.

/** Capabilities only the prime admin (super admin) may grant or revoke. */
export const SUPER_ADMIN_ONLY_CAPABILITIES: readonly string[] = ['compliance.generate_tasks'];

export function canGrantCapability(actor: { is_prime_admin?: boolean | null }, capability: string): boolean {
  if (!SUPER_ADMIN_ONLY_CAPABILITIES.includes(capability)) return true;
  return actor.is_prime_admin === true;
}

/** Restricted capabilities that appear in exactly one of the two sets, i.e. the ones a change would grant or revoke. */
export function restrictedCapabilityChanges(current: Iterable<string>, next: Iterable<string>): string[] {
  const a = new Set(current);
  const b = new Set(next);
  return SUPER_ADMIN_ONLY_CAPABILITIES.filter((c) => a.has(c) !== b.has(c));
}
