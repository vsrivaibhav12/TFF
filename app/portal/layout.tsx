import { requireRole } from '@/lib/auth/require-role';
import { getVisibleModulesForCurrentClient } from '@/lib/auth/portal-visibility';
import { listAccessibleClients } from '@/lib/repositories/clients';
import AppShell, { type NavItem } from '@/components/shell/app-shell';
import MobileBottomNav from '@/components/shell/mobile-bottom-nav';

// Portal sidebar order: Dashboard · Compliance Calendar · Tasks · BizLens · vCFO · Queries · Notices.
const FULL_NAV: Array<NavItem & { gate?: string }> = [
  { href: '/portal',           label: 'Dashboard',           icon: 'layout',     gate: 'portal.dashboard' },
  { href: '/portal/calendar',  label: 'Compliance Calendar', icon: 'calendar',   gate: 'portal.compliance_calendar' },
  { href: '/portal/tasks',     label: 'Work Status',         icon: 'briefcase',  gate: 'portal.tasks' },

  { href: '/portal/bizlens',   label: 'BizLens',             icon: 'chart',      gate: 'portal.bizlens' },
  { href: '/portal/vcfo',      label: 'vCFO',                icon: 'trending',   gate: 'portal.vcfo' },
  { href: '/portal/queries',   label: 'Queries',             icon: 'message',    gate: 'portal.queries' },
  { href: '/portal/notices',   label: 'Notices',             icon: 'scroll',     gate: 'portal.notices' },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const [user, visible, clients] = await Promise.all([
    requireRole('client'),
    getVisibleModulesForCurrentClient(),
    listAccessibleClients(),
  ]);
  const nav = FULL_NAV.filter((n) => !n.gate || visible.has(n.gate as any)).map(({ gate, ...rest }) => rest);

  // For client users, show business name in top bar instead of personal name / UUID email
  const businessName = clients[0]?.business_name;
  const displayUser = businessName ? { ...user, full_name: businessName } : user;

  return (
    <AppShell user={displayUser} role="client" nav={nav}>
      <div className="pb-20 md:pb-0">{children}</div>
      <MobileBottomNav visibleModules={Array.from(visible)} />
    </AppShell>
  );
}
