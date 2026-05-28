/**
 * Maps nav href prefixes to the capability required to see them.
 * Used by both team and admin layouts to dynamically filter sidebar items.
 */
export const NAV_CAPABILITY_MAP: Record<string, string> = {
  // Team pages
  '/team/clients': 'clients.read.all',
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
 * Returns the capability required for a given href, or null if no restriction.
 */
export function getRequiredCapability(href: string): string | null {
  // Exact match first
  if (NAV_CAPABILITY_MAP[href]) return NAV_CAPABILITY_MAP[href];
  // Longest prefix match
  let bestMatch: string | null = null;
  let bestLen = 0;
  for (const prefix of Object.keys(NAV_CAPABILITY_MAP)) {
    if (href.startsWith(prefix + '/') || href === prefix) {
      if (prefix.length > bestLen) {
        bestLen = prefix.length;
        bestMatch = NAV_CAPABILITY_MAP[prefix];
      }
    }
  }
  return bestMatch;
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
    const required = getRequiredCapability(item.href);
    if (!required) return true;
    return capSet.has(required);
  });
}
