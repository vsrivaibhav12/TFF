'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronRight, Clock, LogOut, User } from 'lucide-react';
import { ICONS } from './nav-icons';
import type { NavItem } from './nav-icons';
import { useEffect, useState, useMemo } from 'react';
import { getRecentItems, type RecentItem } from '@/lib/state/recent-items';
import { DockLink } from './dock-link';

interface PersistentSidebarProps {
  role: 'admin' | 'team' | 'client';
  nav: NavItem[];
  user: { full_name: string | null; email: string };
  onLogout: () => void;
}

function getInitials(name: string | null): string {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getModuleRecentType(pathname: string, role: string): string | null {
  const prefix = `/${role}`;
  if (pathname.startsWith(`${prefix}/clients`)) return 'client';
  if (pathname.startsWith(`${prefix}/tasks`)) return 'task';
  if (pathname.startsWith(`${prefix}/queries`)) return 'query';
  if (pathname.startsWith(`${prefix}/notices`)) return 'notice';
  if (pathname.startsWith(`${prefix}/team`)) return 'team';
  return null;
}

export function PersistentSidebar({ role, nav, user, onLogout }: PersistentSidebarProps) {
  const pathname = usePathname();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [recent, setRecent] = useState<RecentItem[]>([]);

  const recentType = useMemo(() => getModuleRecentType(pathname, role), [pathname, role]);

  useEffect(() => {
    if (recentType) {
      setRecent(getRecentItems(recentType));
    } else {
      setRecent([]);
    }
  }, [recentType, pathname]);

  function toggleSection(section: string) {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  // Group nav items by section
  const groups: { section?: string; items: NavItem[] }[] = [];
  let currentGroup: { section?: string; items: NavItem[] } | null = null;

  nav.forEach((item) => {
    if (item.section) {
      if (!currentGroup || currentGroup.section !== item.section) {
        currentGroup = { section: item.section, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(item);
    } else {
      if (!currentGroup || currentGroup.section !== undefined) {
        currentGroup = { items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(item);
    }
  });

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[220px] bg-white border-r border-zinc-200 z-40 flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-zinc-100 shrink-0">
        <Link href={`/${role}`} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            <Image src="/logo.png" width={24} height={24} className="h-5 w-auto object-contain" alt="TFF" priority />
          </div>
          <span className="text-sm font-semibold text-zinc-900">TFF</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-1">
        {groups.map((group, gi) => (
          <div key={group.section ?? `ungrouped-${gi}`}>
            {group.section ? (
              <button
                onClick={() => toggleSection(group.section!)}
                className="w-full flex items-center gap-1 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {group.section}
                <ChevronRight className={cn('ml-auto h-3 w-3 transition-transform', collapsedSections[group.section!] && 'rotate-90')} />
              </button>
            ) : null}
            {!collapsedSections[group.section!] && (
              <div className="space-y-0.5 px-2">
                {group.items.map((n) => {
                  const Icon = ICONS[n.icon] ?? ICONS.layout;
                  const active = pathname === n.href || pathname.startsWith(n.href + '/');
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                        active
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-teal-600' : 'text-zinc-400')} />
                      <span className="truncate">{n.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Recent items */}
        {recent.length > 0 && recentType && (
          <div className="px-2 pt-3">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Recents</div>
            <div className="space-y-0.5 mt-1">
              {recent.map((item) => (
                <DockLink
                  key={item.id}
                  item={{ type: recentType as any, id: item.id }}
                  href={`/${role}/${recentType}s/${item.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors truncate"
                >
                  <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </DockLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="shrink-0 border-t border-zinc-100 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold">
            {getInitials(user.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-zinc-900 truncate">{user.full_name || user.email}</div>
            <div className="text-[10px] text-zinc-500 truncate">{user.email}</div>
          </div>
        </div>
        <div className="flex gap-1">
          <Link
            href="/account/notifications"
            className="flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <User className="h-3.5 w-3.5" /> Account
          </Link>
          <button
            onClick={onLogout}
            className="flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
