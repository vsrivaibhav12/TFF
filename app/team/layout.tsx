import { requireRole } from '@/lib/auth/require-role';
import AppShell from '@/components/shell/app-shell';

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(['team', 'admin']);
  return (
    <AppShell
      user={user}
      role="team"
      nav={[
        /* ── Primary ── */
        { href: '/team', label: 'Home', icon: 'dashboard' },
        { href: '/team/clients', label: 'Clients', icon: 'users' },
        { href: '/team/work', label: 'Work', icon: 'briefcase' },

        /* ── Operations ── */
        { href: '/team/notices', label: 'Notices', icon: 'file-check', section: 'Operations' },
        { href: '/team/hearings', label: 'Hearings', icon: 'gavel', section: 'Operations' },
        { href: '/team/queries', label: 'Queries', icon: 'message', section: 'Operations' },
        { href: '/team/tasks', label: 'Tasks', icon: 'clipboard', section: 'Operations' },

        /* ── My workplace ── */
        { href: '/team/attendance', label: 'Attendance', icon: 'calendar', section: 'My workplace' },
        { href: '/team/leave', label: 'Leave', icon: 'calendar', section: 'My workplace' },
        { href: '/team/approvals', label: 'Approvals', icon: 'shield', section: 'My workplace' },
        { href: '/team/work-done', label: 'Work done', icon: 'clipboard', section: 'My workplace' },
      ]}
    >
      {children}
    </AppShell>
  );
}
