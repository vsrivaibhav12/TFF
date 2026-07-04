'use client';
import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Search, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { bulkLinkSubServiceAction } from '@/lib/actions/services';
import { searchClients } from '@/lib/actions/clients';
import { cn } from '@/lib/utils';

interface Props {
  subServiceId: string;
  /** Initial set of clients to display (server-side limit applies to the parent page). */
  allClients: { id: string; business_name: string; pan?: string | null }[];
  linkedClientIds: string[];
}

export default function LinkClientForm({ subServiceId, allClients, linkedClientIds }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; business_name: string; pan?: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();

  // Merge the parent-provided client list with any server-side search results.
  const mergedClients = useMemo(() => {
    const map = new Map<string, { id: string; business_name: string; pan?: string | null }>();
    allClients.forEach((c) => map.set(c.id, c));
    searchResults.forEach((c) => {
      if (!map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values()).sort((a, b) => a.business_name.localeCompare(b.business_name));
  }, [allClients, searchResults]);

  const available = useMemo(
    () => mergedClients.filter((c) => !linkedClientIds.includes(c.id)),
    [mergedClients, linkedClientIds]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      (c) =>
        c.business_name.toLowerCase().includes(q) ||
        (c.pan ?? '').toLowerCase().includes(q)
    );
  }, [available, search]);

  // Debounced server-side search so the dialog works for rosters larger than the page limit.
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      searchClients({ q, limit: 50 })
        .then((r) => {
          if (r.success) setSearchResults(r.data);
          else setSearchResults([]);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function link() {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      const r = await bulkLinkSubServiceAction({ client_ids: Array.from(selectedIds), sub_service_id: subServiceId });
      if (!r.success) toast.error(r.error);
      else {
        toast.success(`Linked ${r.data?.linked ?? 0} client(s)`);
        setOpen(false);
        setSelectedIds(new Set());
        setSearch('');
        setSearchResults([]);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearch(''); setSelectedIds(new Set()); setSearchResults([]); } }}>
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
              placeholder="Search clients by name or PAN..."
              className="pl-9"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />}
          </div>

          {/* Selected count indicator */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm">
              <Check className="h-4 w-4 text-teal-600" />
              <span className="font-medium text-teal-800">{selectedIds.size} client(s) selected</span>
              <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-teal-600 hover:text-teal-800">Clear all</button>
            </div>
          )}

          {/* Scrollable client list */}
          <div className="max-h-64 overflow-y-auto border border-zinc-200 rounded-lg divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">
                {available.length === 0
                  ? 'All clients are already linked to this sub-service.'
                  : searching
                    ? 'Searching...'
                    : 'No clients match your search.'}
              </p>
            ) : (
              filtered.map((c) => {
                const isSelected = selectedIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3',
                      isSelected
                        ? 'bg-teal-50 text-teal-900 font-medium'
                        : 'text-zinc-700 hover:bg-zinc-50'
                    )}
                  >
                    <div className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                      isSelected ? "border-teal-600 bg-teal-600 text-white" : "border-zinc-300 bg-transparent"
                    )}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span className="truncate">{c.business_name}</span>
                    {c.pan && <span className="ml-auto text-[11px] text-zinc-400 font-mono">{c.pan}</span>}
                  </button>
                );
              })
            )}
          </div>
          <p className="text-xs text-zinc-400">{filtered.length} of {available.length} available client{available.length !== 1 ? 's' : ''}</p>
        </div>
        <DialogFooter>
          <Button onClick={link} disabled={selectedIds.size === 0 || pending}>{pending ? 'Linking...' : 'Link Selected'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
