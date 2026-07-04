'use client';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Bookmark, BookmarkPlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { saveSavedViewAction, deleteSavedViewAction } from '@/lib/actions/saved-views';
import { useConfirm } from '@/components/ui/use-confirm';
import { toast } from 'sonner';

interface SavedView { id: string; name: string; is_default: boolean; filters: Record<string, string> }

type ActionResult<T> = { success: true; data: T } | { success: false; error: string; code?: string };

function unwrapViews(views: SavedView[] | ActionResult<any[]>): SavedView[] {
  if (Array.isArray(views)) return views;
  if (views && typeof views === 'object' && 'success' in views && views.success === true && Array.isArray(views.data)) {
    return views.data as SavedView[];
  }
  return [];
}

export default function SavedViewsBar({ scope, views }: { scope: string; views: SavedView[] | ActionResult<any[]> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  function applyView(v: SavedView) {
    const sp = new URLSearchParams();
    for (const [k, val] of Object.entries(v.filters ?? {})) {
      if (val !== '' && val !== null && val !== undefined) sp.set(k, String(val));
    }
    router.push(`${pathname}?${sp.toString()}`);
  }

  function saveCurrent() {
    const filters: Record<string, string> = {};
    params.forEach((v, k) => { filters[k] = v; });
    if (!name.trim()) { toast.error('Name required'); return; }
    startTransition(async () => {
      const r = await saveSavedViewAction({ scope, name: name.trim(), filters });
      if (r.success) { toast.success('View saved'); setOpen(false); setName(''); router.refresh(); }
      else toast.error(r.error);
    });
  }

  async function remove(v: SavedView) {
    const ok = await confirm({ title: 'Delete View', description: `Delete view "${v.name}"?` });
    if (!ok) return;
    startTransition(async () => {
      const r = await deleteSavedViewAction(v.id);
      if (r.success) { toast.success('Deleted'); router.refresh(); }
      else toast.error(r.error);
    });
  }

  return (
    <>
      <ConfirmDialog />
      <div className="flex items-center gap-2 flex-wrap">
      {unwrapViews(views).map((v) => (
        <span key={v.id} className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white pl-3 pr-1 py-1 text-xs hover:border-teal-400">
          <button onClick={() => applyView(v)} className="flex items-center gap-1" data-testid={`view-${v.id}`}>
            <Bookmark className="h-3 w-3 text-teal-600" /> {v.name}
          </button>
          <button onClick={() => remove(v)} className="p-1 text-zinc-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
        </span>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="text-xs" data-testid="save-view"><BookmarkPlus className="h-3 w-3" /> Save view</Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Save current filters as a view</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ‘Q3 GST overdue’" />
            <div className="text-xs text-zinc-500">This view captures the URL filters currently applied.</div>
          </div>
          <DialogFooter><Button onClick={saveCurrent} disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
