'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Search, X } from 'lucide-react';

interface Props {
  clients: Array<{ id: string; business_name: string }>;
  tasks: Array<{ id: string; title?: string | null; sub_services?: { name?: string } | null }>;
  showStaffFilter?: boolean;
  staff?: Array<{ id: string; full_name: string }>;
}

export default function WorkDoneFilters({ clients, tasks, showStaffFilter, staff }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [from, setFrom] = useState(params.get('from') ?? '');
  const [to, setTo] = useState(params.get('to') ?? '');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [clientId, setClientId] = useState(params.get('client') ?? '__all__');
  const [taskId, setTaskId] = useState(params.get('task') ?? '__all__');
  const [userId, setUserId] = useState(params.get('user') ?? '__all__');

  function apply() {
    const next = new URLSearchParams(params.toString());
    if (from) next.set('from', from); else next.delete('from');
    if (to) next.set('to', to); else next.delete('to');
    if (search.trim()) next.set('q', search.trim()); else next.delete('q');
    if (clientId && clientId !== '__all__') next.set('client', clientId); else next.delete('client');
    if (taskId && taskId !== '__all__') next.set('task', taskId); else next.delete('task');
    if (userId && userId !== '__all__') next.set('user', userId); else next.delete('user');

    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  function clear() {
    setFrom('');
    setTo('');
    setSearch('');
    setClientId('__all__');
    setTaskId('__all__');
    setUserId('__all__');
    startTransition(() => {
      router.push(pathname);
    });
  }

  const clientOptions = [
    { value: '__all__', label: 'All clients', searchString: 'all clients' },
    ...clients.map((c) => ({ value: c.id, label: c.business_name, searchString: c.business_name.toLowerCase() })),
  ];

  const taskOptions = [
    { value: '__all__', label: 'All tasks', searchString: 'all tasks' },
    ...tasks.map((t) => {
      const label = t.sub_services?.name ?? t.title?.split(' — ')[0] ?? 'Untitled task';
      return { value: t.id, label, searchString: label.toLowerCase() };
    }),
  ];

  const staffOptions = [
    { value: '__all__', label: 'All staff', searchString: 'all staff' },
    ...(staff ?? []).map((u) => ({ value: u.id, label: u.full_name, searchString: u.full_name.toLowerCase() })),
  ];

  return (
    <div className="space-y-3 tff-card tff-card-pad">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40 h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40 h-9" />
        </div>
        <div className="space-y-1 min-w-[180px] flex-1">
          <Label className="text-xs">Search notes</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activity notes..."
              className="pl-8 h-9"
              onKeyDown={(e) => e.key === 'Enter' && apply()}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SearchableSelect
          options={clientOptions}
          value={clientId}
          onChange={setClientId}
          placeholder="All clients"
          searchPlaceholder="Search clients..."
        />
        <SearchableSelect
          options={taskOptions}
          value={taskId}
          onChange={setTaskId}
          placeholder="All tasks"
          searchPlaceholder="Search tasks..."
        />
        {showStaffFilter && (
          <SearchableSelect
            options={staffOptions}
            value={userId}
            onChange={setUserId}
            placeholder="All staff"
            searchPlaceholder="Search staff..."
          />
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={apply} disabled={pending}>
          Apply filters
        </Button>
        <Button size="sm" variant="ghost" onClick={clear} disabled={pending}>
          <X className="h-3.5 w-3.5 mr-1" /> Clear
        </Button>
      </div>
    </div>
  );
}
