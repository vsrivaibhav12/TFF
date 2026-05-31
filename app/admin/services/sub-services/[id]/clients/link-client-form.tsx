'use client';
import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Search, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { linkSubServiceAction } from '@/lib/actions/services';
import { cn } from '@/lib/utils';

interface Props {
  subServiceId: string;
  allClients: { id: string; business_name: string }[];
  linkedClientIds: string[];
}

export default function LinkClientForm({ subServiceId, allClients, linkedClientIds }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [pending, startTransition] = useTransition();

  const available = useMemo(
    () => allClients.filter((c) => !linkedClientIds.includes(c.id)),
    [allClients, linkedClientIds],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter((c) => c.business_name.toLowerCase().includes(q));
  }, [available, search]);

  function link() {
    if (!selected) return;
    startTransition(async () => {
      const r = await linkSubServiceAction({ client_id: selected, sub_service_id: subServiceId });
      if (!r.success) toast.error(r.error);
      else {
        toast.success('Client linked');
        setOpen(false);
        setSelected('');
        setSearch('');
        router.refresh();
      }
    });
  }

  const selectedName = allClients.find((c) => c.id === selected)?.business_name;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearch(''); setSelected(''); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
          <Plus className="h-4 w-4 mr-1" /> Link client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Link client to this sub-service</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Selected client indicator */}
          {selected && (
            <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm">
              <Check className="h-4 w-4 text-teal-600" />
              <span className="font-medium text-teal-800">{selectedName}</span>
              <button onClick={() => setSelected('')} className="ml-auto text-xs text-teal-600 hover:text-teal-800">Clear</button>
            </div>
          )}

          {/* Scrollable client list */}
          <div className="max-h-64 overflow-y-auto border border-zinc-200 rounded-lg divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">
                {available.length === 0
                  ? 'All clients are already linked to this sub-service.'
                  : 'No clients match your search.'}
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c.id === selected ? '' : c.id)}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm transition-colors',
                    c.id === selected
                      ? 'bg-teal-50 text-teal-900 font-medium'
                      : 'text-zinc-700 hover:bg-zinc-50'
                  )}
                >
                  {c.business_name}
                </button>
              ))
            )}
          </div>
          <p className="text-xs text-zinc-400">{filtered.length} of {available.length} available client{available.length !== 1 ? 's' : ''}</p>
        </div>
        <DialogFooter>
          <Button onClick={link} disabled={!selected || pending}>{pending ? 'Linking...' : 'Link'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
