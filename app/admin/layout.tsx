import { requireRole } from '@/lib/auth/require-role';
import { listEffectiveCapabilities } from '@/lib/repositories/staff-capabilities';
import { filterNavByCapabilities } from '@/lib/auth/nav-capabilities';
import AppShell from '@/components/shell/app-shell';


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
    { href: '/admin/dsc', label: 'DSC', icon: 'key' as const, section: 'Operations' },

    /* ── Finance ── */
    { href: '/admin/billing', label: 'Billing', icon: 'receipt' as const, section: 'Finance' },

    /* ── Team ── */
    { href: '/admin/team', label: 'Team', icon: 'users-round' as const, section: 'Team' },
    { href: '/admin/workload', label: 'Workload', icon: 'chart' as const, section: 'Team' },
    { href: '/admin/attendance', label: 'Attendance', icon: 'calendar-check' as const, section: 'Team' },
    { href: '/admin/leave', label: 'Leave', icon: 'calendar-off' as const, section: 'Team' },
    { href: '/admin/approvals', label: 'Approvals', icon: 'file-check' as const, section: 'Team' },
    { href: '/admin/work-done', label: 'Work done', icon: 'timer' as const, section: 'Team' },

    /* ── Vault ── */
    { href: '/admin/credentials', label: 'Credentials', icon: 'lock' as const, section: 'Vault' },

    /* ── System ── */
    { href: '/admin/services', label: 'Services', icon: 'layers' as const, section: 'System' },
    { href: '/admin/reports', label: 'Reports', icon: 'chart' as const, section: 'System' },
    { href: '/admin/audit', label: 'Audit', icon: 'scroll' as const, section: 'System' },
    { href: '/admin/super-admins', label: 'Super admins', icon: 'crown' as const, section: 'System' },
    { href: '/admin/settings', label: 'Settings', icon: 'settings' as const, section: 'System' },
  ];

  const nav = filterNavByCapabilities(fullNav, user.role, capabilities);

  return (
    <AppShell
      user={user}
      userRole="admin"
      nav={nav}
    >
      <div data-admin-only>
        {children}
      </div>
    </AppShell>
  );
}
