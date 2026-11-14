'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { deleteSavedViewAction, saveSavedViewAction } from '@/lib/actions/saved-views';
import { sanitizeQuery, type TableLayout } from '@/lib/services/saved-views';
import { readStoredLayout, writeTableLayout } from '@/components/ui/table-enhancements/use-table-prefs';
import { TASK_TABLE_ID } from '@/lib/tasks/table-layout';

export type SavedViewItem = {
  id: string;
  owner_id: string;
  owner_name: string | null;
  name: string;
  query: string;
  layout: TableLayout;
  is_shared: boolean;
};

/**
 * Saved views for the task list: a name for a set of filters plus the table layout (column order, hidden
 * columns, density). Anyone can save their own; a view can be shared with everyone.
 */
export function SavedViewsMenu({ views, currentUserId, isAdmin }: { views: SavedViewItem[]; currentUserId: string; isAdmin: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [share, setShare] = useState(false);
  const [pending, startTransition] = useTransition();

  const currentQuery = sanitizeQuery(params.toString());
  const active = views.find((v) => v.query === currentQuery && (v.query !== '' || params.toString() === ''));
  const mine = views.filter((v) => v.owner_id === currentUserId);
  const shared = views.filter((v) => v.owner_id !== currentUserId && v.is_shared);

  function apply(v: SavedViewItem) {
    if (v.layout.order.length > 0 || Object.keys(v.layout.visible).length > 0) writeTableLayout(TASK_TABLE_ID, v.layout);
    router.push(v.query ? `${pathname}?${v.query}` : pathname);
    setOpen(false);
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Give the view a name');
      return;
    }
    startTransition(async () => {
      const r = await saveSavedViewAction({ scope: 'tasks', name: trimmed, query: params.toString(), layout: readStoredLayout(TASK_TABLE_ID), is_shared: share });
      if (r.success) {
        toast.success(`Saved "${trimmed}"`);
        setName('');
        setShare(false);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function remove(v: SavedViewItem) {
    startTransition(async () => {
      const r = await deleteSavedViewAction(v.id);
      if (r.success) {
        toast.success(`Deleted "${v.name}"`);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  const row = (v: SavedViewItem) => (
    <div key={v.id} className={cn('group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-slate-50', active?.id === v.id && 'bg-[#E6F6F3]')}>
      <button type="button" onClick={() => apply(v)} className="min-w-0 flex-1 text-left">
        <div className={cn('truncate text-[13px]', active?.id === v.id ? 'font-medium text-[#0B6B62]' : 'text-slate-800')}>{v.name}</div>
        {v.owner_id !== currentUserId && v.owner_name && <div className="truncate text-xs text-slate-500">by {v.owner_name}</div>}
      </button>
      {v.is_shared && <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Shared with everyone" />}
      {(v.owner_id === currentUserId || isAdmin) && (
        <button type="button" onClick={() => remove(v)} disabled={pending} className="shrink-0 rounded p-1 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100" aria-label={`Delete ${v.name}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-8 max-w-[14rem] items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors',
            active ? 'border-transparent bg-[#E6F6F3] font-medium text-[#0B6B62]' : 'border-[#DCDFE5] text-slate-600 hover:border-slate-400',
          )}
        >
          <Bookmark className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{active ? active.name : 'Views'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="max-h-72 overflow-y-auto p-1.5">
          {mine.length === 0 && shared.length === 0 && <p className="px-2 py-3 text-sm text-slate-500">No saved views yet. Set up the filters and columns you like, then save them below.</p>}
          {mine.length > 0 && (
            <>
              <div className="tff-eyebrow px-2 pb-1 pt-1.5">Your views</div>
              {mine.map(row)}
            </>
          )}
          {shared.length > 0 && (
            <>
              <div className="tff-eyebrow px-2 pb-1 pt-2">Shared with everyone</div>
              {shared.map(row)}
            </>
          )}
        </div>
        <div className="space-y-2 border-t border-[#E8EAEE] p-2.5">
          <div className="tff-eyebrow">Save the current view</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, for example Overdue GST" maxLength={60} className="h-8 text-sm" onKeyDown={(e) => e.key === 'Enter' && save()} aria-label="View name" />
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="h-3.5 w-3.5 accent-teal-600" />
            Share with everyone
          </label>
          <Button type="button" size="sm" className="w-full" onClick={save} disabled={pending || !name.trim()}>Save view</Button>
          <p className="text-xs text-slate-500">Saves the filters you have on and your column layout. Saving a name you already use replaces it.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
