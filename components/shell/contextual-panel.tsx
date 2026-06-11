'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronRight, Plus, Clock, Filter, Bookmark, Menu, LayoutGrid } from 'lucide-react';
import { ICONS } from './nav-icons';
import type { NavItem } from './nav-icons';
import { useEffect, useState, useMemo } from 'react';
import { getRecentItems, type RecentItem } from '@/lib/state/recent-items';
import { listSavedViews } from '@/lib/actions/saved-views';
import { DockLink } from './dock-link';

interface ContextualPanelProps {
  nav: NavItem[];
  role: 'admin' | 'team' | 'client';
  user: { full_name: string | null; email: string };
  open: boolean;
}

interface ModuleContext {
  label: string;
  scope: string;
  recentType: string;
  quickFilters: { label: string; href: string }[];
  prefix: string;
}

function getModuleContext(pathname: string, role: string): ModuleContext | null {
  const prefix = `/${role}`;
  if (pathname.startsWith(`${prefix}/clients`) || pathname === `${prefix}/clients`) {
    return {
      label: 'Clients',
      scope: `${role}.clients`,
      recentType: 'client',
      quickFilters: [
        { label: 'All clients', href: `${prefix}/clients` },
        { label: 'With portal access', href: `${prefix}/clients?portal=enabled` },
        { label: 'Recently added', href: `${prefix}/clients?sort=recent` },
      ],
      prefix,
    };
  }
  if (pathname.startsWith(`${prefix}/tasks`) || pathname === `${prefix}/tasks`) {
    return {
      label: 'Tasks',
      scope: `${role}.tasks`,
      recentType: 'task',
      quickFilters: [
        { label: 'All tasks', href: `${prefix}/tasks` },
        { label: 'Due today', href: `${prefix}/tasks?due_from=${new Date().toISOString().split('T')[0]}` },
        { label: 'Overdue', href: `${prefix}/tasks?status=overdue` },
        { label: 'Completed', href: `${prefix}/tasks?status=completed` },
      ],
      prefix,
    };
  }
  if (pathname.startsWith(`${prefix}/queries`) || pathname === `${prefix}/queries`) {
    return {
      label: 'Queries',
      scope: `${role}.queries`,
      recentType: 'query',
      quickFilters: [
        { label: 'All queries', href: `${prefix}/queries` },
        { label: 'Open', href: `${prefix}/queries?status=open` },
        { label: 'Resolved', href: `${prefix}/queries?status=resolved` },
      ],
      prefix,
    };
  }
  if (pathname.startsWith(`${prefix}/notices`) || pathname === `${prefix}/notices`) {
    return {
      label: 'Notices',
      scope: `${role}.notices`,
      recentType: 'notice',
      quickFilters: [
        { label: 'All notices', href: `${prefix}/notices` },
        { label: 'Reply pending', href: `${prefix}/notices?status=reply_pending` },
        { label: 'Hearing pending', href: `${prefix}/notices?status=hearing_pending` },
        { label: 'Closed', href: `${prefix}/notices?status=closed` },
      ],
      prefix,
    };
  }
  if (pathname.startsWith(`${prefix}/team`) || pathname === `${prefix}/team`) {
    return {
      label: 'Team',
      scope: `${role}.team`,
      recentType: 'team',
      quickFilters: [
        { label: 'All members', href: `${prefix}/team` },
        { label: 'Admins', href: `${prefix}/team?role=admin` },
        { label: 'Team', href: `${prefix}/team?role=team` },
      ],
      prefix,
    };
  }
  return null;
}

export function ContextualPanel({ nav, role, open }: ContextualPanelProps) {
  const prefix = `/${role}`;
  const pathname = usePathname();
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [showNav, setShowNav] = useState(false);

  const moduleCtx = useMemo(() => getModuleContext(pathname, role), [pathname, role]);
  const currentModule = nav.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + '/')
  );

  // Load recent items and saved views when module changes
  useEffect(() => {
    if (moduleCtx) {
      setRecent(getRecentItems(moduleCtx.recentType));
      listSavedViews(moduleCtx.scope).then((res) => {
        if (res.success) setSavedViews(res.data ?? []);
      });
    } else {
      setRecent([]);
      setSavedViews([]);
    }
  }, [moduleCtx, pathname]);

  if (!open) return null;

  return (
    <aside className="fixed left-[72px] top-0 bottom-0 w-[280px] bg-white border-r border-zinc-200 z-30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-100">
        <h2 className="text-sm font-semibold text-zinc-900">
          {moduleCtx?.label ?? currentModule?.label ?? 'Menu'}
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          {moduleCtx ? 'Workspace context' : `${nav.length} sections`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {moduleCtx ? (
          <ModuleContextPanel
            ctx={moduleCtx}
            recent={recent}
            savedViews={savedViews}
            pathname={pathname}
          />
        ) : null}

        {/* Full Navigation Toggle */}
        <button
          onClick={() => setShowNav((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-600 transition-colors border-t border-zinc-100"
        >
          <Menu className="h-3.5 w-3.5" />
          Full navigation
          <ChevronRight className={cn('ml-auto h-3.5 w-3.5 transition-transform', showNav && 'rotate-90')} />
        </button>

        {showNav && <FullNavigation nav={nav} pathname={pathname} />}
      </div>

      {/* Bottom action */}

    </aside>
  );
}

function ModuleContextPanel({
  ctx,
  recent,
  savedViews,
  pathname,
}: {
  ctx: ModuleContext;
  recent: RecentItem[];
  savedViews: any[];
  pathname: string;
}) {
  return (
    <div className="py-3 space-y-4">
      {/* Quick Filters */}
      <div className="px-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Filter className="h-3 w-3 text-zinc-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Quick filters</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ctx.quickFilters.map((f) => {
            const active = pathname === f.href || pathname.startsWith(f.href + '?');
            return (
              <Link
                key={f.label}
                href={f.href}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors',
                  active
                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Items */}
      {recent.length > 0 && (
        <div className="px-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3 w-3 text-zinc-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Recent</span>
          </div>
          <div className="space-y-1">
            {recent.map((item) => (
              <DockLink
                key={item.id}
                item={{ type: ctx.recentType as any, id: item.id }}
                href={`${ctx.prefix}/${ctx.recentType}s/${item.id}`}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors truncate"
              >
                <LayoutGrid className="h-3 w-3 text-zinc-400 shrink-0" />
                <span className="truncate">{item.label}</span>
              </DockLink>
            ))}
          </div>
        </div>
      )}

      {/* Saved Views */}
      {savedViews.length > 0 && (
        <div className="px-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Bookmark className="h-3 w-3 text-zinc-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Saved views</span>
          </div>
          <div className="space-y-1">
            {savedViews.map((view: any) => (
              <Link
                key={view.id}
                href={`${pathname.split('?')[0]}?view=${view.id}`}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              >
                <Bookmark className="h-3 w-3 text-zinc-400 shrink-0" />
                <span className="truncate">{view.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FullNavigation({ nav, pathname }: { nav: NavItem[]; pathname: string }) {
  let currentSection: string | undefined = undefined;
  let sectionItems: React.ReactNode[] = [];
  const elements: React.ReactNode[] = [];

  const renderItem = (n: NavItem) => {
    const Icon = ICONS[n.icon] ?? ICONS.layout;
    const active = pathname === n.href || pathname.startsWith(n.href + '/');
    return (
      <Link
        key={n.href}
        href={n.href}
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 mx-2',
          active
            ? 'bg-teal-50 text-teal-700 border-l-2 border-teal-500'
            : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            active ? 'text-teal-600' : 'text-zinc-400 group-hover:text-zinc-600'
          )}
        />
        <span className="truncate">{n.label}</span>
        {active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-teal-600/60" />}
      </Link>
    );
  };

  const flushSection = () => {
    if (currentSection && sectionItems.length > 0) {
      elements.push(
        <div key={currentSection} className="px-4 pt-3 pb-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            {currentSection}
          </div>
        </div>
      );
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
      sectionItems.push(renderItem(n));
    } else {
      flushSection();
      elements.push(renderItem(n));
    }
  });
  flushSection();
  return <div className="py-2 pb-4">{elements}</div>;
}
