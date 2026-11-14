'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut,
  Menu,
  X,
  ChevronRight,
  Search,
  LayoutDashboard,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationsBell from './notifications-bell';
import { QuickActionsDropdown } from './quick-actions';
import { GlobalTimer } from './global-timer';
import { ErrorBoundary } from '@/components/error-boundary';
import MobileBottomNavTeam from './mobile-bottom-nav-team';
import { PersistentSidebar, isNavActive } from './persistent-sidebar';
import { ICONS, type NavItem } from './nav-icons';
export { type NavItem } from './nav-icons';
import { useGlobalShortcuts } from '@/lib/hooks/use-global-shortcuts';
import { useDockActions } from '@/lib/state/dock-state';
import { getRecentItems, RECENT_UPDATED_EVENT } from '@/lib/state/recent-items';
import dynamic from 'next/dynamic';

const CommandPalette = dynamic(() => import('./command-palette'), { ssr: false });
const ShortcutsHelp = dynamic(() => import('@/components/sophistication/shortcuts-help'), { ssr: false });
const UniversalDetailDock = dynamic(() => import('./universal-detail-dock').then((m) => ({ default: m.UniversalDetailDock })), { ssr: false });

const SEGMENT_LABELS: Record<string, string> = { workdone: 'work done', 'group-wise': 'group wise', 'service-wise': 'service wise' };

function getInitials(name: string | null): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadge(role: string) {
  const styles: Record<string, string> = {
    admin: 'bg-teal-100 text-teal-800 border-teal-200',
    team: 'bg-zinc-200 text-zinc-800 border-zinc-300',
    client: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  };
  const labels: Record<string, string> = {
    admin: 'Admin',
    team: 'Team',
    client: 'Client',
  };
  return { style: styles[role] || styles.client, label: labels[role] || 'User' };
}

export default function AppShell({
  user,
  userRole,
  nav,
  children,
}: {
  user: { email: string; full_name: string | null; role: string };
  userRole: 'admin' | 'team';
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recentTick, setRecentTick] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  const { clear } = useDockActions();

  const shortcuts = useMemo(() => ({
    '?': (e: KeyboardEvent) => {
      e.preventDefault();
      setShowHelp((v) => !v);
    },
    'c': (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      const path = pathname;
      const selectors = [
        path.includes('/tasks') && '[data-testid="new-task-button"]',
        path.includes('/clients') && '[data-testid="client-new"]',
        path.includes('/credentials') && '[data-testid="cred-new"]',
        path.includes('/dsc') && '[data-testid="dsc-new"]',
        'button[data-testid^="new-"]',
      ].filter(Boolean) as string[];
      for (const sel of selectors) {
        const btn = document.querySelector<HTMLButtonElement>(sel);
        if (btn) { btn.click(); return; }
      }
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    },
    'Escape': () => {
      setShowHelp(false);
      clear();
    },
    'j': (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:navigate', { detail: { direction: 'down' } }));
    },
    'k': (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:navigate', { detail: { direction: 'up' } }));
    },
  }), [pathname, clear]);

  useGlobalShortcuts(shortcuts);

  async function logout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const roleBadge = getRoleBadge(userRole);

  useEffect(() => {
    const bump = () => setRecentTick((n) => n + 1);
    window.addEventListener(RECENT_UPDATED_EVENT, bump);
    bump(); // first client render; avoids a hydration mismatch
    return () => window.removeEventListener(RECENT_UPDATED_EVENT, bump);
  }, []);
  void recentTick; // re-render breadcrumbs when a detail page records its label

  // Build breadcrumbs from pathname
  const breadcrumbSegments = pathname
    .split('/')
    .filter(Boolean)
    .slice(1); // Skip role prefix (admin/team/portal)

  // Desktop content margin for persistent sidebar
  const desktopMargin = 'md:ml-[220px]';

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      {/* Skip-to-content for keyboard accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-teal-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm">
        Skip to content
      </a>

      <div className="flex flex-1">
        {/* Desktop Navigation */}
        <PersistentSidebar role={userRole} nav={nav} user={user} onLogout={logout} />

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2.5">
          <Link href={`/${userRole}`} className="flex items-center gap-2">
            <Image src="/logo.png" width={140} height={28} className="h-7 w-auto object-contain" alt="The Fiscal Fulcrum" priority />
            
          </Link>
          <div className="flex items-center gap-1 min-w-0">
            <GlobalTimer role={userRole} />
            <div>
              <ErrorBoundary>
                <NotificationsBell />
              </ErrorBoundary>
            </div>
            <QuickActionsDropdown role={userRole} />
            <button onClick={() => setMobileOpen((v) => !v)} className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg" aria-label="Open menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-20 bg-zinc-900/30"
              onClick={() => setMobileOpen(false)}
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-lg"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
              >
                <div className="px-5 py-4 border-b border-zinc-100">
                  <div className="flex items-center gap-3">
                    <Image src="/logo.png" width={180} height={36} className="h-9 w-auto object-contain" alt="The Fiscal Fulcrum" priority />
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">The Fiscal Fulcrum</div>
                      <div className="text-xs text-zinc-500 font-medium">
                        {roleBadge.label}
                      </div>
                    </div>
                  </div>
                </div>
                <nav className="px-3 py-3 space-y-0.5">
                  {(() => {
                    let currentSection: string | undefined = undefined;
                    return nav.map((n) => {
                      const Icon = ICONS[n.icon] ?? LayoutDashboard;
                      const active = isNavActive(pathname, n.href, userRole);
                      const showSection = n.section && n.section !== currentSection;
                      if (showSection) currentSection = n.section;
                      return (
                        <div key={n.href}>
                          {showSection && (
                            <div className="px-2.5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                              {n.section}
                            </div>
                          )}
                          <Link
                            href={n.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                              active
                                ? 'bg-teal-50 text-teal-700'
                                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                            )}
                          >
                            <Icon className={cn('h-4 w-4', active ? 'text-teal-600' : 'text-zinc-500')} />
                            {n.label}
                          </Link>
                        </div>
                      );
                    });
                  })()}
                </nav>
                <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center text-xs font-semibold">
                      {getInitials(user.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900 truncate">
                        {user.full_name || user.email}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 py-2 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className={`flex-1 min-w-0 transition-colors duration-300 ${desktopMargin}`}>
          {/* Desktop top bar */}
          <div className="hidden md:flex items-center justify-between gap-4 px-8 h-14 sticky top-0 z-20 bg-[#F6F7F9]/80 backdrop-blur-md border-b border-[#E8EAEE]">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
              <Link href={`/${userRole}`} className="hover:text-zinc-900 transition-colors capitalize">
                {userRole}
              </Link>
              {breadcrumbSegments.map((segment, i) => {
                const isLast = i === breadcrumbSegments.length - 1;
                const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment) || /^\d+$/.test(segment);
                const parent = breadcrumbSegments[i - 1] ?? '';
                const recentLabel = isId && recentTick > 0 ? getRecentItems(parent.replace(/s$/, '')).find((r) => r.id === segment)?.label : undefined;
                const label = isId ? (recentLabel ?? 'Details') : (SEGMENT_LABELS[segment] ?? segment.replace(/-/g, ' '));
                const href = `/${userRole}/${breadcrumbSegments.slice(0, i + 1).join('/')}`;
                return (
                  <span key={`bc-${segment}-${i}`} className="flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
                    {isLast ? (
                      <span className={cn('text-zinc-900 font-medium', !isId && 'capitalize')} aria-current="page">{label}</span>
                    ) : (
                      <Link href={href} className={cn('hover:text-zinc-900 transition-colors', !isId && 'capitalize')}>{label}</Link>
                    )}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              {/* Search trigger */}
              <button
                onClick={() =>
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
                }
                className="flex items-center gap-2 h-9 w-64 xl:w-80 px-3 text-sm text-zinc-500 bg-white border border-[#E8EAEE] rounded-xl shadow-card hover:border-[#DCDFE5] transition-colors group"
              >
                <Search className="h-4 w-4 text-zinc-500 group-hover:text-zinc-700" />
                <span className="text-zinc-500 flex-1 text-left">Search clients, tasks, pages</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-zinc-200 bg-zinc-50 px-1.5 font-mono text-xs font-medium text-zinc-500">
                  <span className="text-xs">Ctrl</span>K
                </kbd>
              </button>

              <div className="flex items-center gap-1">
                <GlobalTimer role={userRole} />
                <ErrorBoundary>
                  <NotificationsBell />
                </ErrorBoundary>
                <QuickActionsDropdown role={userRole} />
              </div>
            </div>
          </div>

          {/* Content area */}
          <div id="main-content" className="px-6 md:px-8 py-6 md:py-8 pt-20 md:pt-6 pb-24 md:pb-8 bg-[#F6F7F9] min-h-screen">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </div>
        </main>

        {/* Mobile bottom nav for staff and admin */}
        {(userRole === 'team' || userRole === 'admin') && <MobileBottomNavTeam nav={nav} role={userRole} />}

        {/* Detail dock */}
        <UniversalDetailDock />

        {/* Global overlays */}
        <ErrorBoundary>
          <CommandPalette role={userRole} />
        </ErrorBoundary>
        <ShortcutsHelp role={userRole} open={showHelp} onClose={() => setShowHelp(false)} />
      </div>
    </div>
  );
}
