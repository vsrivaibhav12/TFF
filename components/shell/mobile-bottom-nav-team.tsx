'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Briefcase, Users, Menu, X, MessageSquare, ClipboardList, Bell, AlertTriangle, ShieldCheck, Calendar } from 'lucide-react';

const TEAM_MAIN = [
  { href: '/team', label: 'Home', icon: LayoutDashboard },
  { href: '/team/work', label: 'Work', icon: Briefcase },
  { href: '/team/clients', label: 'Clients', icon: Users },
];

const TEAM_MORE = [
  { href: '/team/queries', label: 'Queries', icon: MessageSquare },
  { href: '/team/attendance', label: 'Attendance', icon: ClipboardList },
  { href: '/team/leave', label: 'Leave', icon: Calendar },
  { href: '/team/approvals', label: 'Approvals', icon: ShieldCheck },
  { href: '/team/notices', label: 'Notices', icon: AlertTriangle },
  { href: '/team/work-done', label: 'Work done', icon: ClipboardList },
  { href: '/account/notifications', label: 'Notifications', icon: Bell },
];

const ADMIN_MAIN = [
  { href: '/admin', label: 'Home', icon: LayoutDashboard },
  { href: '/admin/work', label: 'Work', icon: Briefcase },
  { href: '/admin/clients', label: 'Clients', icon: Users },
];

const ADMIN_MORE = [
  { href: '/admin/notices', label: 'Notices', icon: AlertTriangle },
  { href: '/admin/queries', label: 'Queries', icon: MessageSquare },
  { href: '/admin/compliance', label: 'Compliance', icon: ClipboardList },
  { href: '/admin/attendance', label: 'Attendance', icon: Calendar },
  { href: '/admin/team', label: 'Team', icon: ShieldCheck },
  { href: '/admin/reports', label: 'Reports', icon: Bell },
  { href: '/account/notifications', label: 'Notifications', icon: Bell },
];

export default function MobileBottomNavTeam() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isAdmin = pathname.startsWith('/admin');
  const MAIN_TABS = isAdmin ? ADMIN_MAIN : TEAM_MAIN;
  const MORE_ITEMS = isAdmin ? ADMIN_MORE : TEAM_MORE;

  const isMoreActive = MORE_ITEMS.some((t) => pathname.startsWith(t.href));

  return (
    <>
      <nav
        data-testid="mobile-bottom-nav-team"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-lg border-t border-zinc-200/60 grid grid-cols-4 pb-[env(safe-area-inset-bottom,0)]"
      >
        {MAIN_TABS.map((t) => {
          const active = t.href === (isAdmin ? '/admin' : '/team')
            ? pathname === (isAdmin ? '/admin' : '/team')
            : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold min-h-[56px] transition-colors',
                active ? 'text-teal-700' : 'text-zinc-400'
              )}
              data-testid={`bottom-tab-${t.label.toLowerCase().replace(/ /g, '-')}`}
            >
              {active && (
                <motion.div
                  layoutId="activeTabTeam"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-teal-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className={cn('h-5 w-5 transition-all', active ? 'stroke-[2.5] -translate-y-0.5' : '')} />
              <span className={cn('transition-all', active ? 'font-bold' : '')}>{t.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'relative flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold min-h-[56px] transition-colors',
            isMoreActive ? 'text-teal-700' : 'text-zinc-400'
          )}
          data-testid="bottom-tab-more"
        >
          {isMoreActive && (
            <motion.div
              layoutId="activeTabTeam"
              className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-teal-500"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <Menu className={cn('h-5 w-5 transition-all', isMoreActive ? 'stroke-[2.5] -translate-y-0.5' : '')} />
          <span className={cn('transition-all', isMoreActive ? 'font-bold' : '')}>More</span>
        </button>
      </nav>

      {/* More drawer */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom,0)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
                <div className="text-sm font-bold text-zinc-900">More</div>
                <button onClick={() => setMoreOpen(false)} className="p-1">
                  <X className="h-5 w-5 text-zinc-500" />
                </button>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {MORE_ITEMS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 border border-zinc-100"
                    >
                      <Icon className="h-5 w-5 text-zinc-400" />
                      {t.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
