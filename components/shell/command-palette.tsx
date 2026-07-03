'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
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
  Inbox,
  Sparkles,
  Building2,
  Calendar,
  ArrowRight,
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

interface SmartSuggestion {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
}

// Quick actions shown when query is empty
function getQuickActions(basePath: string, role: string): CmdItem[] {
  const actions: CmdItem[] = [
    { id: 'act-dashboard', label: 'Go to dashboard', group: 'Navigation', href: `/${role}`, icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    { id: 'act-inbox', label: 'Go to inbox', group: 'Navigation', href: `${basePath}/inbox`, icon: <Inbox className="h-3.5 w-3.5" /> },
    { id: 'act-clients', label: 'Go to clients', group: 'Navigation', href: `${basePath}/clients`, icon: <Users className="h-3.5 w-3.5" /> },
    { id: 'act-tasks', label: 'Go to tasks', group: 'Navigation', href: `${basePath}/tasks`, icon: <Briefcase className="h-3.5 w-3.5" /> },
    { id: 'act-queries', label: 'Go to queries', group: 'Navigation', href: `${basePath}/queries`, icon: <MessageSquare className="h-3.5 w-3.5" /> },
  ];
  if (role !== 'client') {
    actions.unshift(
      { id: 'act-new-task', label: 'Create new task', group: 'Actions', href: `${basePath}/tasks/bulk-create`, icon: <Plus className="h-3.5 w-3.5" />, keywords: 'add create task new' },
      { id: 'act-new-client', label: 'Add new client', group: 'Actions', href: `${basePath}/clients`, icon: <Plus className="h-3.5 w-3.5" />, keywords: 'add client onboard' },
      { id: 'act-attendance', label: 'Mark attendance', group: 'Actions', href: `${basePath}/attendance`, icon: <ClipboardList className="h-3.5 w-3.5" />, keywords: 'punch check in' },
    );
    if (role === 'admin') {
      actions.unshift(
        { id: 'act-compliance', label: 'Compliance dashboard', group: 'Navigation', href: `${basePath}/compliance`, icon: <BarChart3 className="h-3.5 w-3.5" /> },
      );
    }
  }
  return actions;
}

// Natural language pattern parser
function parseNaturalLanguage(query: string, basePath: string, role: string): SmartSuggestion | null {
  const q = query.toLowerCase().trim();

  // "tasks due tomorrow" / "tasks due this week" / "overdue tasks"
  const dueMatch = q.match(/(?:tasks?|work)\s+(?:due|for|by)\s+(tomorrow|today|this week|next week|overdue)/);
  if (dueMatch) {
    const when = dueMatch[1];
    let dateParam = '';
    const today = new Date().toISOString().slice(0, 10);
    if (when === 'tomorrow') {
      const tmr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      dateParam = `?due_from=${today}&due_to=${tmr}`;
    } else if (when === 'today') {
      dateParam = `?due_from=${today}&due_to=${today}`;
    } else if (when === 'this week') {
      const endOfWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      dateParam = `?due_from=${today}&due_to=${endOfWeek}`;
    } else if (when === 'overdue') {
      dateParam = `?overdue=true`;
    }
    return {
      label: `Tasks due ${when}`,
      href: `${basePath}/tasks${dateParam}`,
      icon: <Calendar className="h-3.5 w-3.5" />,
      description: `Show all tasks due ${when}`,
    };
  }

  // "find client [name]" / "search client [name]"
  const clientMatch = q.match(/(?:find|search|look up|show)\s+(?:client|customer)\s+(.+)/);
  if (clientMatch) {
    const name = clientMatch[1].trim();
    return {
      label: `Search clients for "${name}"`,
      href: `${basePath}/clients?q=${encodeURIComponent(name)}`,
      icon: <Users className="h-3.5 w-3.5" />,
      description: `Filter clients by "${name}"`,
    };
  }

  // "find task [name]"
  const taskMatch = q.match(/(?:find|search|look up|show)\s+(?:task|work)\s+(.+)/);
  if (taskMatch) {
    const name = taskMatch[1].trim();
    return {
      label: `Search tasks for "${name}"`,
      href: `${basePath}/tasks?q=${encodeURIComponent(name)}`,
      icon: <Briefcase className="h-3.5 w-3.5" />,
      description: `Filter tasks by "${name}"`,
    };
  }

  // "go to [page]" / "open [page]"
  const goMatch = q.match(/(?:go to|open|navigate to|show me)\s+(.+)/);
  if (goMatch) {
    const page = goMatch[1].trim();
    const pageMap: Record<string, string> = {
      'dashboard': `/${role}`,
      'home': `/${role}`,
      'inbox': `${basePath}/inbox`,
      'clients': `${basePath}/clients`,
      'tasks': `${basePath}/tasks`,
      'queries': `${basePath}/queries`,
      'notices': `${basePath}/notices`,
      'hearings': `${basePath}/hearings`,
      'gst': `${basePath}/gst`,
      'payroll': `${basePath}/payroll`,
      'billing': `${basePath}/billing`,
      'bizlens': `${basePath}/bizlens`,
      'vcfo': `${basePath}/vcfo`,
      'attendance': `${basePath}/attendance`,
      'leave': `${basePath}/leave`,
      'approvals': `${basePath}/approvals`,
      'credentials': `${basePath}/credentials`,
      'settings': `${basePath}/settings`,
      'reports': `${basePath}/reports`,
      'audit': `${basePath}/audit`,
    };
    if (role === 'admin') {
      pageMap['team'] = `${basePath}/team`;
      pageMap['compliance'] = `${basePath}/compliance`;
      pageMap['calendar'] = `${basePath}/compliance`;
    }
    if (role === 'client') {
      pageMap['compliance'] = '/portal/calendar';
      pageMap['calendar'] = '/portal/calendar';
    }
    for (const [key, href] of Object.entries(pageMap)) {
      if (page.includes(key)) {
        return {
          label: `Go to ${key}`,
          href,
          icon: <ArrowRight className="h-3.5 w-3.5" />,
          description: `Navigate to ${key} page`,
        };
      }
    }
  }

  // "new task for [client]"
  const newTaskMatch = q.match(/(?:new|create|add)\s+(?:task|work)\s+(?:for\s+)?(.+)?/);
  if (newTaskMatch && (q.includes('new task') || q.includes('create task') || q.includes('add task'))) {
    const clientHint = newTaskMatch[1]?.trim();
    return {
      label: clientHint ? `Create task for ${clientHint}` : 'Create new task',
      href: clientHint ? `${basePath}/tasks/bulk-create?client_hint=${encodeURIComponent(clientHint)}` : `${basePath}/tasks/bulk-create`,
      icon: <Plus className="h-3.5 w-3.5" />,
      description: clientHint ? `Start creating a task for ${clientHint}` : 'Open task creation form',
    };
  }

  // "new client [name]"
  const newClientMatch = q.match(/(?:new|create|add)\s+(?:client|customer)\s*(.+)?/);
  if (newClientMatch && (q.includes('new client') || q.includes('create client') || q.includes('add client'))) {
    const nameHint = newClientMatch[1]?.trim();
    return {
      label: nameHint ? `Add client "${nameHint}"` : 'Add new client',
      href: `${basePath}/clients`,
      icon: <Plus className="h-3.5 w-3.5" />,
      description: 'Open client creation form',
    };
  }

  // "mark attendance" / "punch in"
  if (q.includes('attendance') || q.includes('punch in') || q.includes('check in')) {
    return {
      label: 'Mark attendance',
      href: `${basePath}/attendance`,
      icon: <ClipboardList className="h-3.5 w-3.5" />,
      description: 'Open attendance page',
    };
  }

  // "high priority tasks" / "urgent tasks"
  if (q.includes('high priority') || q.includes('urgent') || q.includes('critical')) {
    return {
      label: 'High priority tasks',
      href: `${basePath}/tasks?priority=high`,
      icon: <Zap className="h-3.5 w-3.5" />,
      description: 'Show all high priority tasks',
    };
  }

  // "stuck tasks" / "blocked tasks"
  if (q.includes('stuck') || q.includes('blocked')) {
    return {
      label: 'Blocked tasks',
      href: `${basePath}/tasks?blocked=true`,
      icon: <BellRing className="h-3.5 w-3.5" />,
      description: 'Show tasks blocked on client or stuck',
    };
  }

  // "my tasks" / "assigned to me"
  if (q.includes('my tasks') || q.includes('assigned to me') || q.match(/tasks?\s+(?:for|by)\s+me/)) {
    return {
      label: 'My tasks',
      href: `${basePath}/tasks?assigned=me`,
      icon: <Briefcase className="h-3.5 w-3.5" />,
      description: 'Show tasks assigned to you',
    };
  }

  // "my inbox" / "unread"
  if (q.includes('my inbox') || q.includes('inbox')) {
    return {
      label: 'Go to inbox',
      href: `${basePath}/inbox`,
      icon: <Inbox className="h-3.5 w-3.5" />,
      description: 'Open your unified inbox',
    };
  }

  // "overdue notices" / "show notices"
  if (q.includes('notice') || q.includes('gstr') || q.includes('show cause')) {
    if (q.includes('overdue')) {
      return {
        label: 'Overdue notices',
        href: `${basePath}/notices?status=overdue`,
        icon: <BellRing className="h-3.5 w-3.5" />,
        description: 'Show overdue notices',
      };
    }
    return {
      label: 'Go to notices',
      href: `${basePath}/notices`,
      icon: <BellRing className="h-3.5 w-3.5" />,
      description: 'Open notices page',
    };
  }

  // "tasks for [person]"
  const assignedMatch = q.match(/(?:tasks?|work)\s+(?:for|assigned to|by)\s+(.+)/);
  if (assignedMatch && !q.includes('for me')) {
    const person = assignedMatch[1].trim();
    return {
      label: `Tasks for ${person}`,
      href: `${basePath}/tasks?q=${encodeURIComponent(person)}`,
      icon: <UserCircle className="h-3.5 w-3.5" />,
      description: `Search tasks related to ${person}`,
    };
  }

  // "[client] tasks" / "work for [client]"
  const clientTaskMatch = q.match(/^(.+?)\s+(?:tasks?|work)/);
  if (clientTaskMatch) {
    const clientName = clientTaskMatch[1].trim();
    return {
      label: `Tasks for ${clientName}`,
      href: `${basePath}/tasks?q=${encodeURIComponent(clientName)}`,
      icon: <Building2 className="h-3.5 w-3.5" />,
      description: `Search tasks for ${clientName}`,
    };
  }

  // "compliance this month" / "due this month" (admin only; portal uses calendar)
  const monthMatch = q.match(/(?:compliance|tasks?|filings?)\s+(?:this month|due this month)/);
  if (monthMatch && role === 'admin') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    return {
      label: 'Compliance this month',
      href: `${basePath}/compliance?from=${start}&to=${end}`,
      icon: <Calendar className="h-3.5 w-3.5" />,
      description: 'Show compliance events this month',
    };
  }

  // "BizLens for [client]" / "run BizLens"
  if (q.includes('bizlens') || q.includes('financial report')) {
    const bizMatch = q.match(/(?:bizlens|financial report)\s+(?:for\s+)?(.+)?/);
    const clientHint = bizMatch?.[1]?.trim();
    return {
      label: clientHint ? `BizLens for ${clientHint}` : 'Open BizLens',
      href: clientHint ? `${basePath}/bizlens?q=${encodeURIComponent(clientHint)}` : `${basePath}/bizlens`,
      icon: <BarChart3 className="h-3.5 w-3.5" />,
      description: clientHint ? `Run BizLens for ${clientHint}` : 'Open BizLens dashboard',
    };
  }

  return null;
}

export default function CommandPalette({ role }: { role: 'admin' | 'team' | 'client' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [items, setItems] = useState<CmdItem[]>([]);

  const basePath = role === 'admin' ? '/admin' : role === 'client' ? '/portal' : '/team';
  const quickActions = getQuickActions(basePath, role);

  const smartSuggestion = useMemo(() => {
    if (q.length < 3) return null;
    return parseNaturalLanguage(q, basePath, role);
  }, [q, basePath, role]);

  const slashCommands: CmdItem[] = role === 'client' ? [] : [
    {
      id: 'slash-task',
      label: 'Create new task',
      group: 'Actions',
      icon: <Plus className="h-3.5 w-3.5" />,
      keywords: '/task',
      action: () => {
        window.dispatchEvent(new CustomEvent('cmdk:new-task'));
        const btn = document.querySelector<HTMLButtonElement>('[data-testid="new-task-button"]');
        if (btn) { btn.click(); }
        else { router.push(`${basePath}/tasks`); }
      },
    },
    {
      id: 'slash-query',
      label: 'Create new query',
      group: 'Actions',
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      keywords: '/query',
      action: () => {
        window.dispatchEvent(new CustomEvent('cmdk:new-query'));
        const btn = document.querySelector<HTMLButtonElement>('[data-testid="new-query-button"], [data-testid="new-query-btn"]');
        if (btn) { btn.click(); }
        else { router.push(`${basePath}/queries`); }
      },
    },
  ];

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

  // Fetch dynamic suggestions via SWR
  const { data: searchData, isValidating } = useSWR(
    open && q.length >= 2 ? ['cmdk/search', q] : null,
    async ([, query]) => {
      const r = await fetch(`/api/cmdk/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Search failed');
      return r.json();
    },
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (!searchData) {
      setItems([]);
      return;
    }
    const j = searchData;
    const out: CmdItem[] = [];
        for (const c of j.clients ?? []) {
          out.push({ id: `client-${c.id}`, label: c.business_name, group: 'Clients', href: `${basePath}/clients/${c.id}`, icon: <Users className="h-3.5 w-3.5" /> });
        }
        for (const t of j.tasks ?? []) {
          out.push({ id: `task-${t.id}`, label: t.sub_service_name ?? t.title, group: 'Tasks', href: `${basePath}/tasks/${t.id}`, icon: <Briefcase className="h-3.5 w-3.5" />, keywords: `${t.client_name} ${t.sub_service_name ?? ''}` });
        }
        for (const qy of j.queries ?? []) {
          out.push({ id: `query-${qy.id}`, label: qy.subject, group: 'Queries', href: `${basePath}/queries/${qy.id}`, icon: <MessageSquare className="h-3.5 w-3.5" />, keywords: qy.client_name });
        }
        for (const n of j.notices ?? []) {
          out.push({ id: `notice-${n.id}`, label: n.subject, group: 'Notices', href: `${basePath}/notices`, icon: <BellRing className="h-3.5 w-3.5" />, keywords: `${n.client_name} ${n.notice_type}` });
        }
        if (role === 'admin') {
          for (const u of j.team ?? []) {
            out.push({ id: `team-${u.id}`, label: u.full_name, group: 'Team', href: `${basePath}/team/${u.id}`, icon: <UserCircle className="h-3.5 w-3.5" />, keywords: u.email });
          }
        }
        for (const c of j.credentials ?? []) {
          out.push({ id: `cred-${c.id}`, label: c.portal_name, group: 'Credentials', href: `${basePath}/credentials?q=${encodeURIComponent(c.portal_name)}`, icon: <Key className="h-3.5 w-3.5" />, keywords: c.client_name });
        }
    setItems(out);
  }, [searchData, basePath, role]);

  // Merge quick actions (filtered) + search results
  const ql = q.toLowerCase().trim();
  const isSlash = ql.startsWith('/');
  const filteredActions = ql
    ? (isSlash
        ? slashCommands.filter((a) => a.keywords?.toLowerCase().includes(ql))
        : quickActions.filter((a) => a.label.toLowerCase().includes(ql) || (a.keywords ?? '').toLowerCase().includes(ql)))
    : quickActions;
  const allItems = isSlash ? filteredActions : (ql.length >= 2 ? [...filteredActions, ...items] : filteredActions);
  const groups = allItems.reduce<Record<string, CmdItem[]>>((acc, i) => {
    (acc[i.group] = acc[i.group] || []).push(i);
    return acc;
  }, {});

  // Order groups: Actions first, Navigation, then search results
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isTasks = /^\/(?:admin|team)\/tasks(?:\/|$)/.test(path);
  const isClients = /^\/(?:admin|team)\/clients(?:\/|$)/.test(path);
  const isQueries = /^\/(?:admin|team)\/queries(?:\/|$)/.test(path);

  let groupOrder = ['Actions', 'Navigation', 'Clients', 'Tasks', 'Queries', 'Notices', 'Credentials', 'Team'];
  if (isTasks) {
    groupOrder = ['Actions', 'Navigation', 'Tasks', 'Clients', 'Queries', 'Notices', 'Credentials', 'Team'];
  } else if (isClients) {
    groupOrder = ['Actions', 'Navigation', 'Clients', 'Tasks', 'Queries', 'Notices', 'Credentials', 'Team'];
  } else if (isQueries) {
    groupOrder = ['Actions', 'Navigation', 'Queries', 'Clients', 'Tasks', 'Notices', 'Credentials', 'Team'];
  }
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
            placeholder="Search or type a command..."
            className="flex-1 outline-none text-sm placeholder:text-zinc-400 bg-transparent"
            data-testid="cmdk-input"
          />
          <kbd className="text-[10px] text-zinc-400 font-mono bg-zinc-100 px-1.5 py-0.5 rounded">esc</kbd>
        </div>

        {/* Smart suggestion banner */}
        {smartSuggestion && (
          <div className="px-5 py-3 border-b border-zinc-100 bg-teal-50/50">
            <button
              onClick={() => {
                setOpen(false);
                setQ('');
                router.push(smartSuggestion.href);
              }}
              className="w-full flex items-center gap-3 text-left"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-teal-900">{smartSuggestion.label}</div>
                <div className="text-xs text-teal-600">{smartSuggestion.description}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-teal-500 shrink-0" />
            </button>
          </div>
        )}

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
          {ql.length >= 2 && flatItems.length === 0 && !smartSuggestion && (
            <div className="p-8 text-sm text-center text-zinc-500">No matches found.</div>
          )}
        </div>
        <div className="px-5 py-2.5 border-t border-zinc-100 text-[10px] text-zinc-400 flex items-center justify-between">
          <span>↑↓ navigate · ↵ open · esc close</span>
          {isValidating && <span className="text-teal-500">Searching...</span>}
        </div>
      </div>
    </div>
  );
}
