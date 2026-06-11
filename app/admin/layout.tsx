import { requireRole } from '@/lib/auth/require-role';
import { listEffectiveCapabilities } from '@/lib/repositories/staff-capabilities';
import { filterNavByCapabilities } from '@/lib/auth/nav-capabilities';
import AppShell from '@/components/shell/app-shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('admin');
  const capabilities = user.role === 'admin'
    ? []
    : await listEffectiveCapabilities(user.id);

  const fullNav = [
    /* ── Primary ── */
    { href: '/admin', label: 'Home', icon: 'dashboard' as const },
    { href: '/admin/inbox', label: 'Inbox', icon: 'inbox' as const },
    { href: '/admin/clients', label: 'Clients', icon: 'users' as const },
    { href: '/admin/tasks', label: 'Tasks', icon: 'clipboard' as const },

    /* ── Operations ── */
    { href: '/admin/notices', label: 'Notices', icon: 'file-check' as const, section: 'Operations' },
    { href: '/admin/hearings', label: 'Hearings', icon: 'gavel' as const, section: 'Operations' },
    { href: '/admin/queries', label: 'Queries', icon: 'message' as const, section: 'Operations' },
    { href: '/admin/gst', label: 'GST', icon: 'calculator' as const, section: 'Operations' },
    { href: '/admin/tax-projections', label: 'Tax projections', icon: 'receipt' as const, section: 'Operations' },
    { href: '/admin/dsc', label: 'DSC', icon: 'key' as const, section: 'Operations' },

    /* ── Finance ── */
    { href: '/admin/payroll', label: 'Payroll', icon: 'wallet' as const, section: 'Finance' },
    { href: '/admin/billing', label: 'Billing', icon: 'receipt' as const, section: 'Finance' },
    { href: '/admin/bizlens', label: 'BizLens', icon: 'trending' as const, section: 'Finance' },
    { href: '/admin/vcfo', label: 'vCFO', icon: 'chart' as const, section: 'Finance' },

    /* ── Team ── */
    { href: '/admin/team', label: 'Team', icon: 'shield' as const, section: 'Team' },
    { href: '/admin/attendance', label: 'Attendance', icon: 'calendar' as const, section: 'Team' },
    { href: '/admin/leave', label: 'Leave', icon: 'calendar' as const, section: 'Team' },
    { href: '/admin/approvals', label: 'Approvals', icon: 'file-check' as const, section: 'Team' },
    { href: '/admin/work-done', label: 'Work done', icon: 'clipboard' as const, section: 'Team' },

    /* ── Vault ── */
    { href: '/admin/credentials', label: 'Credentials', icon: 'lock' as const, section: 'Vault' },

    /* ── System ── */
    { href: '/admin/services', label: 'Services', icon: 'layers' as const, section: 'System' },
    { href: '/admin/reports', label: 'Reports', icon: 'chart' as const, section: 'System' },
    { href: '/admin/audit', label: 'Audit', icon: 'scroll' as const, section: 'System' },
    { href: '/admin/settings', label: 'Settings', icon: 'settings' as const, section: 'System' },
  ];

  const nav = filterNavByCapabilities(fullNav, user.role, capabilities);

  return (
    <AppShell
      user={user}
      role="admin"
      nav={nav}
    >
      <div data-admin-only>
        {children}
      </div>
    </AppShell>
  );
}
