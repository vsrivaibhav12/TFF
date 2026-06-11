import { requireRole } from '@/lib/auth/require-role';
import { listEffectiveCapabilities } from '@/lib/repositories/staff-capabilities';
import { filterNavByCapabilities } from '@/lib/auth/nav-capabilities';
import AppShell from '@/components/shell/app-shell';

export const dynamic = 'force-dynamic';

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(['team', 'admin']);
  const capabilities = user.role === 'admin'
    ? []
    : await listEffectiveCapabilities(user.id);

  const fullNav = [
    /* ── Primary ── */
    { href: '/team', label: 'Home', icon: 'dashboard' as const },
    { href: '/team/inbox', label: 'Inbox', icon: 'inbox' as const },
    { href: '/team/clients', label: 'Clients', icon: 'users' as const },
    { href: '/team/tasks', label: 'Tasks', icon: 'clipboard' as const },

    /* ── Operations ── */
    { href: '/team/notices', label: 'Notices', icon: 'file-check' as const, section: 'Operations' },
    { href: '/team/hearings', label: 'Hearings', icon: 'gavel' as const, section: 'Operations' },
    { href: '/team/queries', label: 'Queries', icon: 'message' as const, section: 'Operations' },

    /* ── Delegated admin functions (capability-gated) ── */
    { href: '/team/dsc', label: 'DSC', icon: 'key' as const, section: 'Operations' },
    { href: '/team/gst', label: 'GST', icon: 'calculator' as const, section: 'Operations' },
    { href: '/team/tax-projections', label: 'Tax projections', icon: 'receipt' as const, section: 'Operations' },
    { href: '/team/bizlens', label: 'BizLens', icon: 'trending' as const, section: 'Finance' },
    { href: '/team/vcfo', label: 'vCFO', icon: 'chart' as const, section: 'Finance' },
    { href: '/team/payroll', label: 'Payroll', icon: 'wallet' as const, section: 'Finance' },
    { href: '/team/billing', label: 'Billing', icon: 'receipt' as const, section: 'Finance' },
    { href: '/team/services', label: 'Services', icon: 'layers' as const, section: 'System' },
    { href: '/team/reports', label: 'Reports', icon: 'chart' as const, section: 'System' },
    { href: '/team/audit', label: 'Audit', icon: 'scroll' as const, section: 'System' },
    { href: '/team/credentials', label: 'Credentials', icon: 'lock' as const, section: 'Vault' },
    { href: '/team/settings', label: 'Settings', icon: 'settings' as const, section: 'System' },

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
