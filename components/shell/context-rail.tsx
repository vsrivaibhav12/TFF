'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Inbox,
  Users,
  Briefcase,
  CalendarDays,
  Search,
  Bell,
  type LucideIcon,
} from 'lucide-react';
import { ICONS } from './nav-icons';
import type { NavItem } from './nav-icons';

const RAIL_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  inbox: Inbox,
  users: Users,
  clipboard: Briefcase,
  calendar: CalendarDays,
};

interface ContextRailProps {
  role: 'admin' | 'team' | 'client';
  nav: NavItem[];
  user: { full_name: string | null; email: string };
  onTogglePanel?: () => void;
  panelOpen?: boolean;
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

export function ContextRail({ role, nav, user, onTogglePanel, panelOpen }: ContextRailProps) {
  const pathname = usePathname();

  // Primary items for the rail (first few nav items + inbox if present)
  const primaryItems = nav.filter((n) =>
    ['Home', 'Dashboard', 'Clients', 'Tasks', 'Inbox', 'Calendar'].includes(n.label)
  );

  // If we filtered too aggressively, just take first 5
  const railItems = primaryItems.length > 0 ? primaryItems.slice(0, 6) : nav.slice(0, 6);

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-[72px] bg-white border-r border-zinc-200 flex flex-col items-center py-4 z-40">
      {/* Logo */}
      <Link href={`/${role}`} className="mb-6">
        <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
          <Image src="/logo.png" width={28} height={28} className="h-6 w-auto object-contain" alt="TFF" priority />
        </div>
      </Link>

      {/* Primary Nav */}
      <div className="flex-1 flex flex-col gap-1 w-full px-2">
        {railItems.map((n) => {
          const Icon = ICONS[n.icon] ?? LayoutDashboard;
          const active = pathname === n.href || pathname.startsWith(n.href + '/');
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'group relative w-full aspect-square rounded-xl flex items-center justify-center transition-colors',
                active
                  ? 'text-teal-600 bg-teal-50'
                  : 'text-zinc-500 hover:bg-zinc-100'
              )}
              title={n.label}
            >
              <Icon className="w-5 h-5" />
              {n.label === 'Inbox' && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              )}
              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-xs rounded-md whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {n.label}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-1 w-full px-2 mb-2">
        <button
          onClick={onTogglePanel}
          className={cn(
            'group relative w-full aspect-square rounded-xl flex items-center justify-center transition-colors',
            panelOpen ? 'text-teal-600 bg-teal-50' : 'text-zinc-500 hover:bg-zinc-100'
          )}
          title="Toggle panel"
        >
          <Search className="w-5 h-5" />
        </button>
        <button className="group relative w-full aspect-square rounded-xl flex items-center justify-center text-zinc-500 hover:bg-zinc-100 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-teal-500 rounded-full border-2 border-white" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center text-xs font-semibold mx-auto mt-2 cursor-pointer">
          {getInitials(user.full_name)}
        </div>
      </div>
    </nav>
  );
}
