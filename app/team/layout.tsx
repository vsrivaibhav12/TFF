import { requireRole } from '@/lib/auth/require-role';
import { listEffectiveCapabilities } from '@/lib/repositories/staff-capabilities';
import { filterNavByCapabilities } from '@/lib/auth/nav-capabilities';
import AppShell from '@/components/shell/app-shell';


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

    /* ── Work (capability-gated) ── */
    { href: '/team/dsc', label: 'DSC', icon: 'key' as const, section: 'Work' },
    { href: '/team/billing', label: 'Billing', icon: 'receipt' as const, section: 'Work' },
    { href: '/team/services', label: 'Services', icon: 'layers' as const, section: 'Work' },
    { href: '/team/compliance/create-tasks', label: 'Deadline tasks', icon: 'calendar-check' as const, section: 'Work' },

    /* ── My workplace ── */
    { href: '/team/attendance', label: 'Attendance', icon: 'calendar-check' as const, section: 'My workplace' },
    { href: '/team/leave', label: 'Leave', icon: 'calendar-off' as const, section: 'My workplace' },
    { href: '/team/approvals', label: 'Approvals', icon: 'file-check' as const, section: 'My workplace' },
    { href: '/team/work-done', label: 'Work done', icon: 'timer' as const, section: 'My workplace' },

    /* ── Admin functions (capability-gated) ── */
    { href: '/team/reports', label: 'Reports', icon: 'chart' as const, section: 'Admin' },
    { href: '/team/credentials', label: 'Credentials', icon: 'lock' as const, section: 'Admin' },
    { href: '/team/audit', label: 'Audit', icon: 'scroll' as const, section: 'Admin' },
    { href: '/team/settings', label: 'Settings', icon: 'settings' as const, section: 'Admin' },
  ];

  const nav = filterNavByCapabilities(fullNav, user.role, capabilities);

  return (
    <AppShell
      user={user}
      userRole="team"
      nav={nav}
    >
      {children}
    </AppShell>
  );
}
