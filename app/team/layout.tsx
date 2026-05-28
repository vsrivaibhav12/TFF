import { requireRole } from '@/lib/auth/require-role';
import { listGrantedCapabilities } from '@/lib/repositories/staff-capabilities';
import { filterNavByCapabilities } from '@/lib/auth/nav-capabilities';
import AppShell from '@/components/shell/app-shell';

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(['team', 'admin']);
  const capabilities = user.role === 'admin'
    ? []
    : await listGrantedCapabilities(user.id);

  const fullNav = [
    /* ── Primary ── */
    { href: '/team', label: 'Home', icon: 'dashboard' as const },
    { href: '/team/clients', label: 'Clients', icon: 'users' as const },
    { href: '/team/tasks', label: 'Tasks', icon: 'clipboard' as const },

    /* ── Operations ── */
    { href: '/team/notices', label: 'Notices', icon: 'file-check' as const, section: 'Operations' },
    { href: '/team/hearings', label: 'Hearings', icon: 'gavel' as const, section: 'Operations' },
    { href: '/team/queries', label: 'Queries', icon: 'message' as const, section: 'Operations' },

    /* ── Delegated admin functions (capability-gated) ── */
    { href: '/admin/dsc', label: 'DSC', icon: 'key' as const, section: 'Operations' },
    { href: '/admin/notices', label: 'Notices (admin)', icon: 'file-check' as const, section: 'Operations' },
    { href: '/admin/hearings', label: 'Hearings (admin)', icon: 'gavel' as const, section: 'Operations' },
    { href: '/admin/gst', label: 'GST', icon: 'calculator' as const, section: 'Operations' },
    { href: '/admin/tax-projections', label: 'Tax projections', icon: 'receipt' as const, section: 'Operations' },
    { href: '/admin/compliance', label: 'Compliance', icon: 'shield' as const, section: 'Operations' },
    { href: '/admin/bizlens', label: 'BizLens', icon: 'trending' as const, section: 'Finance' },
    { href: '/admin/vcfo', label: 'vCFO', icon: 'chart' as const, section: 'Finance' },
    { href: '/admin/payroll', label: 'Payroll', icon: 'wallet' as const, section: 'Finance' },
    { href: '/admin/billing', label: 'Billing', icon: 'receipt' as const, section: 'Finance' },
    { href: '/admin/services', label: 'Services', icon: 'layers' as const, section: 'System' },
    { href: '/admin/reports', label: 'Reports', icon: 'chart' as const, section: 'System' },
    { href: '/admin/audit', label: 'Audit', icon: 'scroll' as const, section: 'System' },
    { href: '/admin/credentials', label: 'Credentials', icon: 'lock' as const, section: 'Vault' },
    { href: '/admin/settings', label: 'Settings', icon: 'settings' as const, section: 'System' },

    /* ── My workplace ── */
    { href: '/team/attendance', label: 'Attendance', icon: 'calendar' as const, section: 'My workplace' },
    { href: '/team/leave', label: 'Leave', icon: 'calendar' as const, section: 'My workplace' },
    { href: '/team/approvals', label: 'Approvals', icon: 'shield' as const, section: 'My workplace' },
    { href: '/team/work-done', label: 'Work done', icon: 'clipboard' as const, section: 'My workplace' },
  ];

  const nav = filterNavByCapabilities(fullNav, user.role, capabilities);

  return (
    <AppShell
      user={user}
      role="team"
      nav={nav}
    >
      {children}
    </AppShell>
  );
}
