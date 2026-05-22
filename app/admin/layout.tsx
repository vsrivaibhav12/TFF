import { requireRole } from '@/lib/auth/require-role';
import AppShell from '@/components/shell/app-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('admin');
  return (
    <AppShell
      user={user}
      role="admin"
      nav={[
        /* ── Primary ── */
        { href: '/admin', label: 'Home', icon: 'dashboard' },
        { href: '/admin/clients', label: 'Clients', icon: 'users' },
        { href: '/admin/work', label: 'Work', icon: 'briefcase' },

        /* ── Operations ── */
        { href: '/admin/notices', label: 'Notices', icon: 'file-check', section: 'Operations' },
        { href: '/admin/hearings', label: 'Hearings', icon: 'gavel', section: 'Operations' },
        { href: '/admin/queries', label: 'Queries', icon: 'message', section: 'Operations' },
        { href: '/admin/compliance', label: 'Compliance', icon: 'clipboard', section: 'Operations' },
        { href: '/admin/gst', label: 'GST', icon: 'calculator', section: 'Operations' },
        { href: '/admin/tax-projections', label: 'Tax projections', icon: 'receipt', section: 'Operations' },
        { href: '/admin/dsc', label: 'DSC', icon: 'key', section: 'Operations' },

        /* ── Finance ── */
        { href: '/admin/payroll', label: 'Payroll', icon: 'wallet', section: 'Finance' },
        { href: '/admin/billing', label: 'Billing', icon: 'receipt', section: 'Finance' },
        { href: '/admin/bizlens', label: 'BizLens', icon: 'trending', section: 'Finance' },
        { href: '/admin/vcfo', label: 'vCFO', icon: 'chart', section: 'Finance' },

        /* ── Team ── */
        { href: '/admin/team', label: 'Team', icon: 'shield', section: 'Team' },
        { href: '/admin/attendance', label: 'Attendance', icon: 'calendar', section: 'Team' },
        { href: '/admin/leave', label: 'Leave', icon: 'calendar', section: 'Team' },
        { href: '/admin/approvals', label: 'Approvals', icon: 'check-circle', section: 'Team' },

        /* ── Vault ── */
        { href: '/admin/credentials', label: 'Credentials', icon: 'lock', section: 'Vault' },

        /* ── System ── */
        { href: '/admin/services', label: 'Services', icon: 'layers', section: 'System' },
        { href: '/admin/reports', label: 'Reports', icon: 'chart', section: 'System' },
        { href: '/admin/audit', label: 'Audit', icon: 'scroll', section: 'System' },
        { href: '/admin/settings', label: 'Settings', icon: 'settings', section: 'System' },
      ]}
    >
      <div data-admin-only>{children}</div>
    </AppShell>
  );
}
