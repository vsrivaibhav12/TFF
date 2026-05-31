'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Briefcase,
  Users,
  Plus,
  LayoutDashboard,
  MessageSquare,
  ClipboardList,
  BarChart3,
  Zap,
  BellRing,
  UserCircle,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CmdItem {
  id: string;
  label: string;
  href?: string;
  group: string;
  icon?: React.ReactNode;
  keywords?: string;
  action?: () => void;
}

// Quick actions shown when query is empty
function getQuickActions(basePath: string, role: string): CmdItem[] {
  const actions: CmdItem[] = [
    { id: 'act-dashboard', label: 'Go to dashboard', group: 'Navigation', href: `/${role}`, icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    { id: 'act-clients', label: 'Go to clients', group: 'Navigation', href: `${basePath}/clients`, icon: <Users className="h-3.5 w-3.5" /> },
    { id: 'act-tasks', label: 'Go to tasks', group: 'Navigation', href: `${basePath}/tasks`, icon: <Briefcase className="h-3.5 w-3.5" /> },
    { id: 'act-queries', label: 'Go to queries', group: 'Navigation', href: `${basePath}/queries`, icon: <MessageSquare className="h-3.5 w-3.5" /> },
  ];
  if (role !== 'client') {
    actions.unshift(
      { id: 'act-new-task', label: 'Create new task', group: 'Actions', href: `${basePath}/tasks/bulk-create`, icon: <Plus className="h-3.5 w-3.5" />, keywords: 'add create task new' },
      { id: 'act-new-client', label: 'Add new client', group: 'Actions', href: `${basePath === '/admin' ? '/admin' : '/admin'}/clients/new`, icon: <Plus className="h-3.5 w-3.5" />, keywords: 'add client onboard' },
      { id: 'act-attendance', label: 'Mark attendance', group: 'Actions', href: '/team/attendance', icon: <ClipboardList className="h-3.5 w-3.5" />, keywords: 'punch check in' },
      { id: 'act-compliance', label: 'Compliance dashboard', group: 'Navigation', href: `${basePath}/compliance`, icon: <BarChart3 className="h-3.5 w-3.5" /> },
    );
  }
  return actions;
}

export default function CommandPalette({ role }: { role: 'admin' | 'team' | 'client' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [items, setItems] = useState<CmdItem[]>([]);
  const [pending, startTransition] = useTransition();

  const basePath = role === 'admin' ? '/admin' : role === 'client' ? '/portal' : '/team';
  const quickActions = getQuickActions(basePath, role);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') setOpen(false);
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onOpenEvent);
    };
  }, []);

  // When query changes, fetch dynamic suggestions
  useEffect(() => {
    if (!open || q.length < 2) {
      setItems([]);
      return;
    }
    startTransition(async () => {
      try {
        const r = await fetch(`/api/cmdk/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
        const j = await r.json();
        const out: CmdItem[] = [];
        for (const c of j.clients ?? []) {
          out.push({ id: `client-${c.id}`, label: c.business_name, group: 'Clients', href: `${basePath}/clients/${c.id}`, icon: <Users className="h-3.5 w-3.5" /> });
        }
        for (const t of j.tasks ?? []) {
          out.push({ id: `task-${t.id}`, label: t.title, group: 'Tasks', href: `${basePath}/tasks/${t.id}`, icon: <Briefcase className="h-3.5 w-3.5" />, keywords: t.client_name });
        }
        for (const n of j.notices ?? []) {
          out.push({ id: `notice-${n.id}`, label: n.subject, group: 'Notices', href: `${basePath}/notices`, icon: <BellRing className="h-3.5 w-3.5" />, keywords: `${n.client_name} ${n.notice_type}` });
        }
        for (const u of j.team ?? []) {
          out.push({ id: `team-${u.id}`, label: u.full_name, group: 'Team', href: `/admin/team/${u.id}`, icon: <UserCircle className="h-3.5 w-3.5" />, keywords: u.email });
        }
        for (const c of j.credentials ?? []) {
          out.push({ id: `cred-${c.id}`, label: c.portal_name, group: 'Credentials', href: `/admin/credentials?q=${encodeURIComponent(c.portal_name)}`, icon: <Key className="h-3.5 w-3.5" />, keywords: c.client_name });
        }
        setItems(out);
      } catch {
        setItems([]);
      }
    });
  }, [q, open, basePath]);

  // Merge quick actions (filtered) + search results
  const ql = q.toLowerCase().trim();
  const filteredActions = ql
    ? quickActions.filter((a) => a.label.toLowerCase().includes(ql) || (a.keywords ?? '').toLowerCase().includes(ql))
    : quickActions;
  const allItems = ql.length >= 2 ? [...filteredActions, ...items] : filteredActions;
  const groups = allItems.reduce<Record<string, CmdItem[]>>((acc, i) => {
    (acc[i.group] = acc[i.group] || []).push(i);
    return acc;
  }, {});

  // Order groups: Actions first, Navigation, then search results
  const groupOrder = ['Actions', 'Navigation', 'Clients', 'Tasks', 'Notices', 'Credentials', 'Team'];
  const orderedGroups = Object.entries(groups).sort(
    ([a], [b]) => (groupOrder.indexOf(a) === -1 ? 99 : groupOrder.indexOf(a)) - (groupOrder.indexOf(b) === -1 ? 99 : groupOrder.indexOf(b))
  );

  const flatItems = orderedGroups.flatMap(([, items]) => items);

  function go(item: CmdItem) {
    setOpen(false);
    setQ('');
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] bg-zinc-900/40 backdrop-blur-sm"
      onClick={() => { setOpen(false); setQ(''); }}
      data-testid="cmdk-overlay"
    >
      <div
        className="w-full max-w-xl mx-4 rounded-2xl border border-zinc-200/50 bg-white/90 backdrop-blur-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
          <Search className="h-4 w-4 text-zinc-400 shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(flatItems.length - 1, a + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); if (flatItems[active]) go(flatItems[active]); }
            }}
            placeholder="Search or jump to..."
            className="flex-1 outline-none text-sm placeholder:text-zinc-400 bg-transparent"
            data-testid="cmdk-input"
          />
          <kbd className="text-[10px] text-zinc-400 font-mono bg-zinc-100 px-1.5 py-0.5 rounded">esc</kbd>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {orderedGroups.map(([gname, groupItems]) => (
            <div key={gname}>
              <div className="px-5 pt-3 pb-1 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                {gname === 'Actions' && <Zap className="h-3 w-3" />}
                {gname}
              </div>
              {groupItems.map((i) => {
                const idx = flatItems.indexOf(i);
                return (
                  <button
                    key={i.id}
                    onClick={() => go(i)}
                    onMouseEnter={() => setActive(idx)}
                    className={cn(
                      'w-full flex items-center gap-3 px-5 py-2.5 text-sm text-left transition-colors',
                      idx === active
                        ? 'bg-teal-50 text-teal-900'
                        : 'text-zinc-700 hover:bg-zinc-50'
                    )}
                    data-testid={`cmdk-item-${i.id}`}
                  >
                    <span className={cn('shrink-0', idx === active ? 'text-teal-600' : 'text-zinc-400')}>
                      {i.icon}
                    </span>
                    <span className="flex-1 truncate">{i.label}</span>
                    {idx === active && (
                      <kbd className="text-[10px] text-teal-500 font-mono">↵</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {ql.length >= 2 && flatItems.length === 0 && (
            <div className="p-8 text-sm text-center text-zinc-500">No matches found.</div>
          )}
        </div>
        <div className="px-5 py-2.5 border-t border-zinc-100 text-[10px] text-zinc-400 flex items-center justify-between">
          <span>↑↓ navigate · ↵ open · esc close</span>
          {pending && <span className="text-teal-500">Searching...</span>}
        </div>
      </div>
    </div>
  );
}
