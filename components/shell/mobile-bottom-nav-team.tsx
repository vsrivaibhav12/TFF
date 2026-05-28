'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bell } from 'lucide-react';
import { ICONS, type NavItem } from './nav-icons';

interface MobileBottomNavTeamProps {
  nav: NavItem[];
  role: 'admin' | 'team' | 'client';
}

export default function MobileBottomNavTeam({ nav, role }: MobileBottomNavTeamProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Always append notifications
  const notificationsLink = { href: '/account/notifications', label: 'Notifications', icon: 'bell' as const };
  const allItems = [...nav, notificationsLink];

  // First 3 are main tabs, rest go into More
  const mainItems = allItems.slice(0, 3);
  const moreItems = allItems.slice(3);

  const isMoreActive = moreItems.some((t) => pathname.startsWith(t.href));

  return (
    <>
      <nav
        data-testid="mobile-bottom-nav-team"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-lg border-t border-zinc-200/60 grid grid-cols-4 pb-[env(safe-area-inset-bottom,0)]"
      >
        {mainItems.map((t) => {
          const Icon = ICONS[t.icon];
          const active = t.href === `/${role}`
            ? pathname === `/${role}`
            : pathname.startsWith(t.href);
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
              {Icon && <Icon className={cn('h-5 w-5 transition-all', active ? 'stroke-[2.5] -translate-y-0.5' : '')} />}
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
                {moreItems.map((t) => {
                  const Icon = ICONS[t.icon];
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 border border-zinc-100"
                    >
                      {Icon && <Icon className="h-5 w-5 text-zinc-400" />}
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
