/**
 * Closed list of named capabilities (v3).
 * This file is NOT marked server-only so it can be imported by client components.
 *
 * v3 changes:
 * - Added tasks.delete (was removed in v2 but needed for action-layer gating)
 * - Added workdone.manage (separated from tasks.complete)
 * - Removed dead capabilities with zero enforcement: documents.upload, documents.delete,
 *   labels.view, custom_fields.view, billing.view, compliance_rules.view, payroll.view
 * - Kept insights.configure and manage_solution_log (RLS-referenced; action checks added)
 * - tasks.view remains the read-all tasks capability (enforced in pages + RLS)
 */
export const ALL_CAPABILITIES = [
  // Clients
  'clients.read.all', 'clients.create', 'clients.edit', 'clients.delete',
  'clients.assign_team', 'clients.toggle_portal',

  // Services catalogue
  'services.view', 'services.manage', 'services.assign',

  // Staff / roles
  'staff.manage', 'staff.grant_capabilities',

  // Vault
  'dsc.view', 'dsc.manage',
  'credentials.view', 'credentials.manage',

  // Tasks
  'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign', 'tasks.complete', 'tasks.delete',

  // Compliance, notices, hearings
  'compliance.view', 'compliance.enter',
  'notices.view', 'notices.manage',
  'hearings.view', 'hearings.manage',

  // Advisory / insights
  'bizlens.view', 'bizlens.enter',
  'vcfo.view', 'vcfo.enter',
  'insights.view', 'insights.configure',

  // Payroll / HR / approvals
  'payroll.run',
  'attendance.view_all', 'attendance.approve', 'leave.approve', 'permission.approve',

  // Queries / audit
  'queries.view', 'queries.assign',
  'audit.view',

  // Documents
  'documents.view',

  // Billing / settings
  'manage_billing_entities',
  'manage_compliance_rules',
  'manage_custom_fields',
  'manage_labels',

  // Work tracking
  'workdone.manage',
  'view_workdone_reports',
  'manage_solution_log',

  // Admin meta
  'verify_tasks',
  'promote_to_admin',
] as const;

export type Capability = typeof ALL_CAPABILITIES[number];
