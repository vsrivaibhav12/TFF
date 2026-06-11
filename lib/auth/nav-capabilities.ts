/**
 * Maps nav href prefixes to the capability(s) required to see them.
 * Used by both team and admin layouts to dynamically filter sidebar items.
 * Value can be a single capability string or an array of capabilities (any one grants access).
 *
 * v2: pages are gated on view/read caps; write caps are checked inside pages/actions.
 */
export const NAV_CAPABILITY_MAP: Record<string, string | string[]> = {
  // Team primary pages — read caps govern visibility; write caps are checked inside pages/actions
  '/team/clients': ['clients.read.all', 'clients.create', 'clients.edit', 'clients.delete', 'clients.assign_team', 'clients.toggle_portal'],
  '/team/tasks': ['tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign', 'tasks.complete', 'tasks.delete'],
  '/team/notices': ['notices.view', 'notices.manage'],
  '/team/hearings': ['hearings.view', 'hearings.manage'],
  '/team/queries': ['queries.view', 'queries.assign'],
  '/team/inbox': 'queries.view',
  '/team/approvals': ['attendance.approve', 'leave.approve', 'permission.approve'],
  '/team/work-done': ['workdone.manage', 'view_workdone_reports'],

  // Admin-delegated pages (shown in team sidebar when granted)
  '/admin/dsc': ['dsc.view', 'dsc.manage'],
  '/admin/credentials': ['credentials.view', 'credentials.manage'],
  '/admin/notices': ['notices.view', 'notices.manage'],
  '/admin/hearings': ['hearings.view', 'hearings.manage'],
  '/admin/gst': ['compliance.view', 'compliance.enter'],
  '/admin/tax-projections': ['compliance.view', 'compliance.enter'],
  '/admin/compliance': ['compliance.view', 'compliance.enter', 'manage_compliance_rules'],
  '/admin/bizlens': ['bizlens.view', 'bizlens.enter'],
  '/admin/vcfo': ['vcfo.view', 'vcfo.enter'],
  '/admin/payroll': ['payroll.run'],
  '/admin/billing': ['manage_billing_entities'],
  '/admin/services': ['services.view', 'services.manage'],
  '/admin/team': 'staff.manage',
  '/admin/reports': ['view_workdone_reports', 'audit.view'],
  '/admin/audit': 'audit.view',
  '/admin/settings': ['staff.manage', 'manage_custom_fields', 'manage_compliance_rules', 'manage_billing_entities'],
  '/admin/work-done': ['workdone.manage', 'view_workdone_reports'],

  // Team equivalents of admin-delegated pages
  '/team/dsc': ['dsc.view', 'dsc.manage'],
  '/team/credentials': ['credentials.view', 'credentials.manage'],
  '/team/gst': ['compliance.view', 'compliance.enter'],
  '/team/tax-projections': ['compliance.view', 'compliance.enter'],
  '/team/bizlens': ['bizlens.view', 'bizlens.enter'],
  '/team/vcfo': ['vcfo.view', 'vcfo.enter'],
  '/team/payroll': ['payroll.run'],
  '/team/billing': ['manage_billing_entities'],
  '/team/services': ['services.view', 'services.manage'],
  '/team/reports': ['view_workdone_reports', 'audit.view'],
  '/team/audit': 'audit.view',
  '/team/settings': ['staff.manage', 'manage_custom_fields', 'manage_compliance_rules', 'manage_billing_entities'],
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
