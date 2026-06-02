'use client';
import Link from 'next/link';
import Image from 'next/image';
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
import { QuickActionsDropdown } from './quick-actions';
import { GlobalTimer } from './global-timer';
import { ErrorBoundary } from '@/components/error-boundary';

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
        className="w-full flex items-center justify-between px-2.5 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
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
    <div className="flex flex-col min-h-screen bg-[#F7F6F3]">
      {/* R-6: Skip-to-content for keyboard accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-teal-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm">Skip to content</a>
      <div className="flex flex-1">
        {/* Sidebar (desktop) — floating bento style */}
        <aside className="hidden md:flex fixed left-3 top-3 bottom-3 flex-col rounded-[20px] shadow-sidebar border border-zinc-200/50 bg-white z-30 transition-all duration-300 w-[64px] hover:w-[240px] group/aside overflow-hidden" aria-label="Main navigation">
          {/* Logo + collapse toggle */}
          <div className="flex items-center justify-between px-2 py-4 group-hover/aside:px-5 group-hover/aside:py-5 transition-all">
            <Link href={`/${role}`} className="flex items-center gap-2.5">
              <Image src="/logo.png" width={160} height={32} className="h-8 w-auto object-contain shrink-0" alt="The Fiscal Fulcrum" priority />
              <div className="opacity-0 group-hover/aside:opacity-100 transition-opacity whitespace-nowrap overflow-hidden">
                  <div className="text-sm font-bold tracking-tight text-zinc-900 leading-none">
                    The <span className="text-teal-600">Fiscal</span>
                  </div>
                  <div className="text-sm font-bold tracking-tight text-zinc-900 leading-none">
                    Fulcrum
                  </div>
                </div>
            </Link>
            
          </div>
          

          {/* Nav */}
          <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto px-1.5 group-hover/aside:px-3 transition-all" aria-label="Sidebar">
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
                      'group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200',
                      active
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        active ? 'text-teal-600' : 'text-zinc-400 group-hover:text-zinc-600'
                      )}
                    />
                    <span className="opacity-0 group-hover/aside:opacity-100 whitespace-nowrap transition-opacity truncate">{n.label}</span>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-teal-600/60 opacity-0 group-hover/aside:opacity-100 transition-opacity" />
                  </Link>
                );
              };

              const flushSection = () => {
                if (currentSection && sectionItems.length > 0) {
                  elements.push(<div key={currentSection} className="px-2.5 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 opacity-0 group-hover/aside:opacity-100 transition-opacity whitespace-nowrap overflow-hidden">{currentSection}</div>);
                    elements.push(...sectionItems);
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
          <div className="mb-3 rounded-xl border border-zinc-100 bg-zinc-50 mx-1.5 p-2 group-hover/aside:mx-3 group-hover/aside:p-3 flex items-center transition-all overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {getInitials(user.full_name)}
              </div>
              <div className="min-w-0 flex-1 opacity-0 group-hover/aside:opacity-100 transition-opacity whitespace-nowrap overflow-hidden ml-3">
                  <div className="text-sm font-medium text-zinc-800 truncate">
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
            </div>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between border-b border-white/10 bg-teal-900/95 backdrop-blur-lg px-4 py-3">
          <Link href={`/${role}`} className="flex items-center gap-2">
            <Image src="/logo.png" width={140} height={28} className="h-7 w-auto object-contain" alt="The Fiscal Fulcrum" priority />
            <span className="text-sm font-bold text-white">TFF</span>
          </Link>
          <div className="flex items-center gap-1">
            <GlobalTimer role={role} />
            <ErrorBoundary>
              <NotificationsBell />
            </ErrorBoundary>
            <QuickActionsDropdown role={role} />
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
                    <Image src="/logo.png" width={180} height={36} className="h-9 w-auto object-contain" alt="The Fiscal Fulcrum" priority />
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
        <main className="flex-1 min-w-0 transition-all duration-300 md:ml-[88px]">
          {/* Desktop top bar */}
          <div className="hidden md:flex items-center justify-between gap-4 px-8 pt-8 pb-4 sticky top-0 z-20 bg-[#F7F6F3]/80 backdrop-blur-xl">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
              <Link href={`/${role}`} className="hover:text-zinc-900 transition-colors capitalize">
                {role === 'client' ? 'Portal' : role}
              </Link>
              {breadcrumbSegments.map((segment, i) => (
                <span key={`bc-${segment}-${i}`} className="flex items-center gap-1.5">
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
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-500 bg-white/60 backdrop-blur-lg border border-zinc-200/80 rounded-xl shadow-sm">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                <span>{formatToday()}</span>
              </div>

              {/* Search trigger */}
              <button
                onClick={() =>
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
                }
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-500 bg-white/60 backdrop-blur-lg border border-zinc-200/80 rounded-xl hover:border-zinc-300 hover:bg-white shadow-sm transition-all group"
              >
                <Search className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600" />
                <span className="text-zinc-400 hidden xl:inline">Search...</span>
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded-md border bg-white px-1.5 font-mono text-[10px] font-medium text-zinc-400">
                  <span className="text-[10px]">Ctrl</span>K
                </kbd>
              </button>
              
              <div className="bg-white/60 backdrop-blur-lg border border-zinc-200/80 rounded-xl shadow-sm flex items-center p-1">
                <GlobalTimer role={role} />
                <ErrorBoundary>
                  <NotificationsBell />
                </ErrorBoundary>
                <QuickActionsDropdown role={role} />
              </div>

              {/* User avatar dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 hover:bg-zinc-100 transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden shadow-sm">
                    {getInitials(user.full_name)}
                  </div>
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-[20px] border border-zinc-200 bg-white shadow-floating z-50 py-2">
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
          <div id="main-content" className="px-6 md:px-8 py-6 md:py-8 pt-20 md:pt-2 pb-24 md:pb-8 bg-[#F7F6F3] min-h-screen">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </div>
        </main>

        {/* Mobile bottom nav for staff and admin (R-13) */}
        {(role === 'team' || role === 'admin') && <MobileBottomNavTeam nav={nav} role={role} />}

        {/* Global overlays */}
        <ErrorBoundary>
          <CommandPalette role={role} />
        </ErrorBoundary>
        <ShortcutsHelp role={role} />

      </div>
    </div>
  );
}
