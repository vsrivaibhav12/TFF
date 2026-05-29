/**
 * Maps nav href prefixes to the capability(s) required to see them.
 * Used by both team and admin layouts to dynamically filter sidebar items.
 * Value can be a single capability string or an array of capabilities (any one grants access).
 */
export const NAV_CAPABILITY_MAP: Record<string, string | string[]> = {
  // Team pages
  '/team/clients': ['clients.read.all', 'clients.create', 'clients.edit', 'clients.delete', 'clients.assign_team', 'clients.toggle_portal'],
  '/team/notices': 'notices.manage',
  '/team/hearings': 'hearings.manage',
  '/team/approvals': 'attendance.approve',

  // Admin-delegated pages (shown in team sidebar when granted)
  '/admin/dsc': 'dsc.manage',
  '/admin/credentials': 'credentials.manage',
  '/admin/notices': 'notices.manage',
  '/admin/hearings': 'hearings.manage',
  '/admin/gst': 'compliance.enter',
  '/admin/tax-projections': 'compliance.enter',
  '/admin/compliance': 'manage_compliance_rules',
  '/admin/bizlens': 'bizlens.enter',
  '/admin/vcfo': 'vcfo.enter',
  '/admin/payroll': 'payroll.run',
  '/admin/billing': 'manage_billing_entities',
  '/admin/services': 'services.manage',
  '/admin/team': 'staff.manage',
  '/admin/reports': 'view_workdone_reports',
  '/admin/audit': 'audit.view',
  '/admin/settings': 'staff.manage',
};

/**
 * Returns the capability(s) required for a given href, or null if no restriction.
 */
export function getRequiredCapabilities(href: string): string[] | null {
  // Exact match first
  const exact = NAV_CAPABILITY_MAP[href];
  if (exact) return Array.isArray(exact) ? exact : [exact];
  // Longest prefix match
  let bestMatch: string | string[] | null = null;
  let bestLen = 0;
  for (const prefix of Object.keys(NAV_CAPABILITY_MAP)) {
    if (href.startsWith(prefix + '/') || href === prefix) {
      if (prefix.length > bestLen) {
        bestLen = prefix.length;
        bestMatch = NAV_CAPABILITY_MAP[prefix];
      }
    }
  }
  return bestMatch ? (Array.isArray(bestMatch) ? bestMatch : [bestMatch]) : null;
}

/**
 * Filter a nav array down to items the user is allowed to see.
 * Admins implicitly see everything.
 */
export function filterNavByCapabilities(
  nav: Array<{ href: string; label: string; icon: string; section?: string }>,
  userRole: string,
  capabilities: string[]
): typeof nav {
  if (userRole === 'admin') return nav;
  const capSet = new Set(capabilities);
  return nav.filter((item) => {
    const required = getRequiredCapabilities(item.href);
    if (!required) return true;
    return required.some((cap) => capSet.has(cap));
  });
}
