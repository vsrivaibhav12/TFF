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

export type CapabilityPersona = 'daily' | 'supervisory' | 'admin';

export interface CapabilityMeta {
  label: string;
  description: string;
  persona: CapabilityPersona;
  category: string;
}

/**
 * Human-readable metadata for every capability.
 *
 * - persona: which staff workflow the capability belongs to.
 * - category: logical module area (used for module-style grouping).
 */
export const CAPABILITY_DETAILS: Record<Capability, CapabilityMeta> = {
  // Clients
  'clients.read.all': {
    label: 'View clients',
    description: 'Open client profiles. Team members see only clients they are assigned to unless they also have view-all access.',
    persona: 'daily',
    category: 'Clients',
  },
  'clients.create': {
    label: 'Create clients',
    description: 'Add new client records and basic business details.',
    persona: 'supervisory',
    category: 'Clients',
  },
  'clients.edit': {
    label: 'Edit clients',
    description: 'Update client profiles, contacts, PAN/GSTIN, and lifecycle stage.',
    persona: 'supervisory',
    category: 'Clients',
  },
  'clients.delete': {
    label: 'Delete clients',
    description: 'Soft-delete client records.',
    persona: 'supervisory',
    category: 'Clients',
  },
  'clients.assign_team': {
    label: 'Assign team to clients',
    description: 'Link staff members to clients as lead or associate.',
    persona: 'supervisory',
    category: 'Clients',
  },
  'clients.toggle_portal': {
    label: 'Toggle client portal',
    description: 'Enable or disable portal access for a client and choose visible modules.',
    persona: 'supervisory',
    category: 'Clients',
  },

  // Services
  'services.view': {
    label: 'View services',
    description: 'Browse the service catalogue, categories, and sub-services.',
    persona: 'supervisory',
    category: 'Services',
  },
  'services.manage': {
    label: 'Manage services',
    description: 'Create and edit service categories, services, sub-services, and SOPs.',
    persona: 'admin',
    category: 'Services',
  },
  'services.assign': {
    label: 'Assign services to clients',
    description: 'Map clients to the services and sub-services the firm handles for them.',
    persona: 'supervisory',
    category: 'Services',
  },

  // Staff
  'staff.manage': {
    label: 'Manage staff',
    description: 'Add, edit, deactivate, and manage staff accounts and basic profiles.',
    persona: 'admin',
    category: 'Staff',
  },
  'staff.grant_capabilities': {
    label: 'Grant capabilities',
    description: 'Assign or revoke capabilities for team members and apply role templates.',
    persona: 'admin',
    category: 'Staff',
  },

  // Vault
  'dsc.view': {
    label: 'View DSC records',
    description: 'View digital signature certificates and expiry tracker.',
    persona: 'admin',
    category: 'Vault',
  },
  'dsc.manage': {
    label: 'Manage DSC records',
    description: 'Add, renew, and update DSC records.',
    persona: 'admin',
    category: 'Vault',
  },
  'credentials.view': {
    label: 'View credentials',
    description: 'View stored portal credentials (without revealing passwords).',
    persona: 'admin',
    category: 'Vault',
  },
  'credentials.manage': {
    label: 'Manage credentials',
    description: 'Add, edit, and reveal decrypted passwords in the credentials vault.',
    persona: 'admin',
    category: 'Vault',
  },

  // Tasks
  'tasks.view': {
    label: 'View all tasks',
    description: 'See tasks across all assigned clients, not only tasks assigned to me.',
    persona: 'daily',
    category: 'Tasks',
  },
  'tasks.create': {
    label: 'Create tasks',
    description: 'Create new tasks, bulk-create tasks, and import task lists.',
    persona: 'supervisory',
    category: 'Tasks',
  },
  'tasks.edit': {
    label: 'Edit tasks',
    description: 'Change task details, due dates, priority, sub-service, and template.',
    persona: 'supervisory',
    category: 'Tasks',
  },
  'tasks.assign': {
    label: 'Assign tasks',
    description: 'Assign tasks to staff and set reviewers.',
    persona: 'supervisory',
    category: 'Tasks',
  },
  'tasks.complete': {
    label: 'Complete tasks',
    description: 'Mark tasks as completed or in-progress and fill checklists.',
    persona: 'daily',
    category: 'Tasks',
  },
  'tasks.delete': {
    label: 'Delete tasks',
    description: 'Soft-delete tasks.',
    persona: 'supervisory',
    category: 'Tasks',
  },

  // Compliance, notices, hearings
  'compliance.view': {
    label: 'View compliance calendar',
    description: 'View compliance events and filing deadlines.',
    persona: 'supervisory',
    category: 'Compliance',
  },
  'compliance.enter': {
    label: 'Enter compliance data',
    description: 'Record filing status, dates, and notes against compliance events.',
    persona: 'supervisory',
    category: 'Compliance',
  },
  'manage_compliance_rules': {
    label: 'Manage compliance rules',
    description: 'Create and edit compliance calendar rules and recurrence logic.',
    persona: 'supervisory',
    category: 'Compliance',
  },
  'notices.view': {
    label: 'View notices',
    description: 'View notices received from tax and regulatory authorities.',
    persona: 'supervisory',
    category: 'Notices & Hearings',
  },
  'notices.manage': {
    label: 'Manage notices',
    description: 'Add, update, and link notices to tasks and clients.',
    persona: 'supervisory',
    category: 'Notices & Hearings',
  },
  'hearings.view': {
    label: 'View hearings',
    description: 'View hearing schedules and statuses.',
    persona: 'supervisory',
    category: 'Notices & Hearings',
  },
  'hearings.manage': {
    label: 'Manage hearings',
    description: 'Add and update hearing records and outcomes.',
    persona: 'supervisory',
    category: 'Notices & Hearings',
  },

  // Advisory
  'bizlens.view': {
    label: 'View BizLens',
    description: 'View BizLens financial intelligence dashboards and reports.',
    persona: 'supervisory',
    category: 'Advisory',
  },
  'bizlens.enter': {
    label: 'Enter BizLens data',
    description: 'Input or update BizLens financial data for clients.',
    persona: 'supervisory',
    category: 'Advisory',
  },
  'vcfo.view': {
    label: 'View vCFO',
    description: 'View vCFO advisory dashboards and projections.',
    persona: 'supervisory',
    category: 'Advisory',
  },
  'vcfo.enter': {
    label: 'Enter vCFO data',
    description: 'Input or update vCFO advisory data and assumptions.',
    persona: 'supervisory',
    category: 'Advisory',
  },
  'insights.view': {
    label: 'View insights',
    description: 'View generated business insights and red flags.',
    persona: 'supervisory',
    category: 'Advisory',
  },
  'insights.configure': {
    label: 'Configure insights',
    description: 'Configure insight generation rules and schedules.',
    persona: 'supervisory',
    category: 'Advisory',
  },

  // Payroll / HR
  'payroll.run': {
    label: 'Run payroll',
    description: 'Process payroll and generate payroll outputs.',
    persona: 'supervisory',
    category: 'HR & Payroll',
  },
  'attendance.view_all': {
    label: 'View all attendance',
    description: 'View attendance records for all staff, not only self.',
    persona: 'supervisory',
    category: 'HR & Payroll',
  },
  'attendance.approve': {
    label: 'Approve attendance',
    description: 'Approve or reject attendance corrections and weekly submissions.',
    persona: 'supervisory',
    category: 'HR & Payroll',
  },
  'leave.approve': {
    label: 'Approve leave',
    description: 'Approve or reject leave requests.',
    persona: 'supervisory',
    category: 'HR & Payroll',
  },
  'permission.approve': {
    label: 'Approve permissions',
    description: 'Approve or reject short-leave / permission requests.',
    persona: 'supervisory',
    category: 'HR & Payroll',
  },

  // Queries / audit
  'queries.view': {
    label: 'View queries',
    description: 'View client queries and responses.',
    persona: 'daily',
    category: 'Queries',
  },
  'queries.assign': {
    label: 'Assign queries',
    description: 'Assign client queries to team members.',
    persona: 'supervisory',
    category: 'Queries',
  },
  'audit.view': {
    label: 'View audit log',
    description: 'View audit logs, capability history, and data changes.',
    persona: 'supervisory',
    category: 'Audit',
  },

  // Documents
  'documents.view': {
    label: 'View documents',
    description: 'View documents in the document vault.',
    persona: 'daily',
    category: 'Documents',
  },

  // Billing / settings
  'manage_billing_entities': {
    label: 'Manage billing entities',
    description: 'Manage billing organisations, GSTINs, and invoice entities.',
    persona: 'supervisory',
    category: 'Billing & Settings',
  },
  'manage_custom_fields': {
    label: 'Manage custom fields',
    description: 'Create and edit custom field definitions for tasks.',
    persona: 'supervisory',
    category: 'Billing & Settings',
  },
  'manage_labels': {
    label: 'Manage labels',
    description: 'Create and edit task labels and tags.',
    persona: 'supervisory',
    category: 'Billing & Settings',
  },

  // Work tracking
  'workdone.manage': {
    label: 'Log work done',
    description: 'Log time and work-done entries against tasks.',
    persona: 'daily',
    category: 'Work tracking',
  },
  'view_workdone_reports': {
    label: 'View work-done reports',
    description: 'View aggregated work-done and time reports across the team.',
    persona: 'supervisory',
    category: 'Work tracking',
  },
  'manage_solution_log': {
    label: 'Manage solution log',
    description: 'Maintain the solution log and reusable knowledge base entries.',
    persona: 'supervisory',
    category: 'Work tracking',
  },

  // Admin meta
  'verify_tasks': {
    label: 'Verify tasks',
    description: 'Verify tasks completed by other team members.',
    persona: 'supervisory',
    category: 'Tasks',
  },
  'promote_to_admin': {
    label: 'Promote to admin',
    description: 'Promote a team member to full admin access.',
    persona: 'admin',
    category: 'Staff',
  },
};

/** Persona-based groups used when explaining capabilities to staff. */
export const CAPABILITY_PERSONAS: Array<{
  key: CapabilityPersona;
  label: string;
  description: string;
}> = [
  {
    key: 'daily',
    label: 'My daily work',
    description: 'Capabilities a staff member needs to complete their own tasks, fill checklists, log work done, and view data shared with them.',
  },
  {
    key: 'supervisory',
    label: 'Senior / supervisory',
    description: 'Capabilities for senior staff who create and assign work, view records across the team, and approve attendance, leave, or permissions.',
  },
  {
    key: 'admin',
    label: 'Admin',
    description: 'Capabilities reserved for firm owners and administrators, including staff management, vault access, and service catalogue control.',
  },
];

/** Module-style categories used in role-template editing. */
export const CAPABILITY_CATEGORIES = [
  'Clients',
  'Services',
  'Staff',
  'Vault',
  'Tasks',
  'Compliance',
  'Notices & Hearings',
  'Advisory',
  'HR & Payroll',
  'Queries',
  'Documents',
  'Billing & Settings',
  'Work tracking',
  'Audit',
] as const;
