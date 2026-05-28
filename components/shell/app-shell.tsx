'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  PanelLeft,
  PanelLeftClose,
  Layout,
  Calendar,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationsBell from './notifications-bell';
import CommandPalette from './command-palette';
import ShortcutsHelp from '@/components/sophistication/shortcuts-help';

import MobileBottomNavTeam from './mobile-bottom-nav-team';
import { ICONS, type NavItem } from './nav-icons';
export { type NavItem } from './nav-icons';

// Collapsible section state for sidebar (R-12)
function CollapsibleSection({ label, children, defaultOpen = true }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-2.5 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-teal-200/50 hover:text-teal-100/70 transition-colors"
        aria-expanded={open}
      >
        {label}
        <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />
      </button>
      {open && children}
    </div>
  );
}


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
    admin: 'bg-teal-500/20 text-teal-100 border-teal-400/30',
    team: 'bg-blue-500/20 text-blue-100 border-blue-400/30',
    client: 'bg-white/10 text-teal-100/70 border-white/10',
  };
  const labels: Record<string, string> = {
    admin: 'Admin',
    team: 'Team',
    client: 'Client',
  };
  return { style: styles[role] || styles.client, label: labels[role] || 'User' };
}

function formatToday(): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

export default function AppShell({
  user,
  role,
  nav,
  children,
}: {
  user: { email: string; full_name: string | null; role: string };
  role: 'admin' | 'team' | 'client';
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tff_sidebar_collapsed') === 'true';
    }
    return false;
  });
  useEffect(() => {
    localStorage.setItem('tff_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  async function logout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const roleBadge = getRoleBadge(role);

  // Build breadcrumbs from pathname
  const breadcrumbSegments = pathname
    .split('/')
    .filter(Boolean)
    .slice(1); // Skip role prefix (admin/team/portal)

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA]">
      {/* R-6: Skip-to-content for keyboard accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-teal-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm">Skip to content</a>
      <div className="flex flex-1">
        {/* Sidebar (desktop) — fixed, does not scroll with page */}
        <aside className={cn(
          "hidden md:flex fixed left-0 top-0 bottom-0 flex-col border-r border-white/10 bg-teal-900 z-30 transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )} aria-label="Main navigation">
          {/* Logo + collapse toggle */}
          <div className={cn("flex items-center justify-between", sidebarCollapsed ? "px-2 py-4" : "px-5 py-5")}>
            <Link href={`/${role}`} className="flex items-center gap-2.5">
              <img src="/logo.svg" className="h-8 w-auto brightness-0 invert" alt="The Fiscal Fulcrum" />
              {!sidebarCollapsed && (
                <div>
                  <div className="text-sm font-bold tracking-tight text-white leading-none">
                    The <span className="text-teal-300">Fiscal</span>
                  </div>
                  <div className="text-sm font-bold tracking-tight text-white leading-none">
                    Fulcrum
                  </div>
                </div>
              )}
            </Link>
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="text-white/40 hover:text-white/80 transition-colors p-1"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
          {sidebarCollapsed && (
            <div className="flex justify-center pb-2">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="text-white/40 hover:text-white/80 transition-colors p-1"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Nav */}
          <nav className={cn("flex-1 py-2 space-y-0.5 overflow-y-auto", sidebarCollapsed ? "px-1.5" : "px-3")} aria-label="Sidebar">
            {(() => {
              let currentSection: string | undefined = undefined;
              let sectionItems: React.ReactNode[] = [];
              const elements: React.ReactNode[] = [];

              const renderItem = (n: NavItem) => {
                const Icon = ICONS[n.icon] ?? Layout;
                const active = pathname === n.href || pathname.startsWith(n.href + '/');
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    data-testid={`nav-${n.label.toLowerCase().replace(/ /g, '-')}`}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200',
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:bg-white/8 hover:text-white'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        active ? 'text-teal-300' : 'text-white/50 group-hover:text-white/80'
                      )}
                    />
                    {!sidebarCollapsed && <span className="truncate">{n.label}</span>}
                    {!sidebarCollapsed && active && (
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-teal-300/60" />
                    )}
                  </Link>
                );
              };

              const flushSection = () => {
                if (currentSection && sectionItems.length > 0) {
                  if (sidebarCollapsed) {
                    // When collapsed, render section items flat without headers
                    elements.push(...sectionItems);
                  } else {
                    elements.push(
                      <CollapsibleSection key={currentSection} label={currentSection}>
                        {sectionItems}
                      </CollapsibleSection>
                    );
                  }
                  sectionItems = [];
                }
              };

              nav.forEach((n) => {
                if (n.section && n.section !== currentSection) {
                  flushSection();
                  currentSection = n.section;
                }
                if (n.section) {
                  sectionItems.push(<div key={n.href}>{renderItem(n)}</div>);
                } else {
                  elements.push(<div key={n.href}>{renderItem(n)}</div>);
                }
              });
              flushSection();
              return elements;
            })()}
          </nav>

          {/* User profile */}
          <div className={cn("mb-3 rounded-xl border border-white/10 bg-white/5", sidebarCollapsed ? "mx-1.5 p-2 flex justify-center" : "mx-3 p-3")}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {getInitials(user.full_name)}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-teal-50 truncate">
                    {user.full_name || user.email}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                        roleBadge.style
                      )}
                    >
                      {roleBadge.label}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between border-b border-white/10 bg-teal-900/95 backdrop-blur-lg px-4 py-3">
          <Link href={`/${role}`} className="flex items-center gap-2">
            <img src="/logo.svg" className="h-7 w-auto brightness-0 invert" alt="The Fiscal Fulcrum" />
            <span className="text-sm font-bold text-white">TFF</span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <button onClick={() => setMobileOpen((v) => !v)} className="p-2 text-teal-100" aria-label="menu">
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
              className="md:hidden fixed inset-0 z-20 bg-black/30 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute left-0 top-0 bottom-0 w-72 bg-teal-900 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
              >
                <div className="px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <img src="/logo.svg" className="h-9 w-auto brightness-0 invert" alt="The Fiscal Fulcrum" />
                    <div>
                      <div className="text-sm font-bold text-white">The Fiscal Fulcrum</div>
                      <div className="text-[10px] text-teal-200/60 uppercase tracking-wider font-semibold">
                        {roleBadge.label}
                      </div>
                    </div>
                  </div>
                </div>
                <nav className="px-3 py-3 space-y-0.5">
                  {(() => {
                    let currentSection: string | undefined = undefined;
                    return nav.map((n) => {
                      const Icon = ICONS[n.icon] ?? Layout;
                      const active = pathname === n.href || pathname.startsWith(n.href + '/');
                      const showSection = n.section && n.section !== currentSection;
                      if (showSection) currentSection = n.section;
                      return (
                        <div key={n.href}>
                          {showSection && (
                            <div className="px-2.5 pt-4 pb-1 text-[10px] uppercase tracking-widest text-teal-200/50 font-bold">
                              {n.section}
                            </div>
                          )}
                          <Link
                            href={n.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                              active
                                ? 'bg-teal-500/25 text-white'
                                : 'text-teal-100/80 hover:bg-white/8 hover:text-white'
                            )}
                          >
                            <Icon className={cn('h-4 w-4', active ? 'text-teal-300' : 'text-teal-200/60')} />
                            {n.label}
                          </Link>
                        </div>
                      );
                    });
                  })()}
                </nav>
                <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                      {getInitials(user.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-teal-50 truncate">
                        {user.full_name || user.email}
                      </div>
                      <div className="text-xs text-teal-200/60">{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm text-teal-100/70 hover:text-teal-50 py-2 rounded-lg hover:bg-white/5 transition-colors"
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
        <main className={cn("flex-1 min-w-0 transition-all duration-300", sidebarCollapsed ? "md:ml-16" : "md:ml-64")}>
          {/* Desktop top bar */}
          <div className="hidden md:flex items-center justify-between gap-4 px-8 py-4 sticky top-0 z-20 bg-white/80 backdrop-blur-2xl border-b border-zinc-200/60">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
              <Link href={`/${role}`} className="hover:text-zinc-900 transition-colors capitalize">
                {role === 'client' ? 'Portal' : role}
              </Link>
              {breadcrumbSegments.map((segment, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
                  <span
                    className={cn(
                      'capitalize',
                      i === breadcrumbSegments.length - 1
                        ? 'text-zinc-900 font-medium'
                        : 'hover:text-zinc-900 transition-colors'
                    )}
                  >
                    {segment.replace(/-/g, ' ')}
                  </span>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Date pill */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-500 bg-zinc-50/80 border border-zinc-200/80 rounded-lg">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                <span>{formatToday()}</span>
              </div>

              {/* Search trigger */}
              <button
                onClick={() =>
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
                }
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-500 bg-zinc-50/80 border border-zinc-200/80 rounded-lg hover:border-zinc-300 hover:bg-white transition-all group"
              >
                <Search className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600" />
                <span className="text-zinc-400 hidden xl:inline">Search...</span>
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-zinc-400">
                  <span className="text-[10px]">Ctrl</span>K
                </kbd>
              </button>
              <NotificationsBell />

              {/* User avatar dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-100 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                    {getInitials(user.full_name)}
                  </div>
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-zinc-200 bg-white shadow-lg z-50 py-2">
                      <div className="px-4 py-3 border-b border-zinc-100">
                        <div className="text-sm font-medium text-zinc-900 truncate">{user.full_name || user.email}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{user.email}</div>
                      </div>
                      <Link
                        href="/account/notifications"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        <User className="h-4 w-4 text-zinc-400" />
                        Account
                      </Link>
                      <button
                        onClick={() => { setUserMenuOpen(false); logout(); }}
                        data-testid="logout-btn"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        <LogOut className="h-4 w-4 text-zinc-400" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Content area */}
          <div id="main-content" className="px-6 md:px-8 py-6 md:py-8 pt-20 md:pt-6 pb-24 md:pb-8 bg-[#F8F9FA] min-h-screen">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </div>
        </main>

        {/* Mobile bottom nav for staff and admin (R-13) */}
        {(role === 'team' || role === 'admin') && <MobileBottomNavTeam nav={nav} role={role} />}

        {/* Global overlays */}
        <CommandPalette role={role} />
        <ShortcutsHelp role={role} />

      </div>
    </div>
  );
}
