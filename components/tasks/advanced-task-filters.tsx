'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Filter, X, Calendar as CalendarIcon, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface AdvancedTaskFiltersProps {
  clients: { id: string; business_name: string }[];
  team: { id: string; full_name: string }[];
  subServices: { id: string; name: string }[];
  templates?: { id: string; name: string }[];
}

export default function AdvancedTaskFilters({ clients, team, subServices, templates = [] }: AdvancedTaskFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Initialize state from URL params
  const [f, setF] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    params.forEach((val, key) => { v[key] = val; });
    return v;
  });

  const [isOpen, setIsOpen] = useState(false);

  const apply = useCallback((next: Record<string, string>) => {
    const sp = new URLSearchParams();
    for (const [k, val] of Object.entries(next)) {
      if (val !== undefined && val !== '' && val !== 'all' && val !== 'false') {
        sp.set(k, val);
      }
    }
    // preserve page parameter if we're not changing filters that affect count?
    // actually changing filters should reset to page 1
    sp.delete('page');
    router.push(`${pathname}?${sp.toString()}`);
  }, [router, pathname]);

  function update(key: string, val: string) {
    const next = { ...f, [key]: val === 'all' ? '' : val };
    setF(next);
    apply(next);
  }

  function clearAll() {
    setF({});
    router.push(pathname);
    setIsOpen(false);
  }

  const activeCount = Object.values(f).filter(v => v !== '' && v !== 'all' && v !== 'false').length;

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-2 shadow-sm mb-4 space-y-3">
      {/* Primary quick filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 pl-2 pr-1">
          <Filter className="h-4 w-4" /> Filters
        </div>
        
        <Select value={f.status || 'all'} onValueChange={(v) => update('status', v)}>
          <SelectTrigger className="w-36 h-8 text-xs bg-zinc-50 border-dashed">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="blocked">Awaiting client (Blocked)</SelectItem>
            <SelectItem value="stuck">Stuck</SelectItem>
          </SelectContent>
        </Select>

        <Select value={f.priority || 'all'} onValueChange={(v) => update('priority', v)}>
          <SelectTrigger className="w-32 h-8 text-xs bg-zinc-50 border-dashed">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        <Select value={f.assigned || 'all'} onValueChange={(v) => update('assigned', v)}>
          <SelectTrigger className="w-40 h-8 text-xs bg-zinc-50 border-dashed">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any assignee</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {team.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={f.client || 'all'} onValueChange={(v) => update('client', v)}>
          <SelectTrigger className="w-48 h-8 text-xs bg-zinc-50 border-dashed">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any client</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs border-dashed bg-zinc-50 ml-auto">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              More Filters
              {activeCount > 4 && (
                <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px] rounded-sm">{activeCount - 4}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[420px] p-0" sideOffset={8}>
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50 rounded-t-xl">
              <h4 className="font-semibold text-sm">Advanced Filters</h4>
              {activeCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-zinc-500 hover:text-red-600 px-2" onClick={clearAll}>
                  Clear all
                </Button>
              )}
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Sub-service</Label>
                <Select value={f.sub_service || 'all'} onValueChange={(v) => update('sub_service', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    {subServices.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Period Year</Label>
                <Input type="number" placeholder="e.g. 2026" className="h-8 text-xs" value={f.period_year || ''} onChange={(e) => update('period_year', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Due From</Label>
                <Input type="date" className="h-8 text-xs" value={f.due_from || ''} onChange={(e) => update('due_from', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Due To</Label>
                <Input type="date" className="h-8 text-xs" value={f.due_to || ''} onChange={(e) => update('due_to', e.target.value)} />
              </div>
              <div className="space-y-1.5 col-span-2 border-t border-zinc-100 pt-3">
                <Label className="text-xs text-zinc-500 mb-2 block">Attributes</Label>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={f.is_billable === 'true'} onCheckedChange={(c) => update('is_billable', c ? 'true' : 'false')} />
                    <span className="text-xs">Billable tasks</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={f.is_stuck === 'true'} onCheckedChange={(c) => update('is_stuck', c ? 'true' : 'false')} />
                    <span className="text-xs">Marked as Stuck</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={f.is_verified === 'true'} onCheckedChange={(c) => update('is_verified', c ? 'true' : 'false')} />
                    <span className="text-xs">Verified by Manager</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-100 rounded-b-xl flex justify-end">
              <Button size="sm" onClick={() => setIsOpen(false)}>Done</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters display bar */}
      {activeCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap px-2 pb-1">
          <span className="text-xs text-zinc-400 mr-1">Active:</span>
          {Object.entries(f).map(([k, v]) => {
            if (!v || v === 'all' || v === 'false') return null;
            let label = `${k}: ${v}`;
            if (k === 'status') label = `Status: ${v.replace('_', ' ')}`;
            if (k === 'priority') label = `Priority: ${v}`;
            if (k === 'assigned') label = `Assignee: ${v === 'unassigned' ? 'Unassigned' : team.find(t => t.id === v)?.full_name || v}`;
            if (k === 'client') label = `Client: ${clients.find(c => c.id === v)?.business_name || v}`;
            if (k === 'is_billable') label = `Billable Only`;
            if (k === 'is_stuck') label = `Stuck Only`;
            if (k === 'is_verified') label = `Verified Only`;

            return (
              <Badge key={k} variant="outline" className="bg-teal-50 text-teal-800 hover:bg-teal-100 text-[10px] pr-1 border border-teal-100">
                {label}
                <button onClick={() => update(k, '')} className="ml-1 text-teal-600 hover:text-teal-900 focus:outline-none">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-5 px-2 ml-1 text-[10px] text-zinc-500 hover:text-zinc-900">
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
