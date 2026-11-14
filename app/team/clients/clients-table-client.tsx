'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { useDebouncedCallback } from '@/lib/hooks/use-debounced-callback';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DockLink } from '@/components/shell/dock-link';
import { ClientHoverCard } from '@/components/clients/client-hover-card';
import { EditableCell } from '@/components/tasks/editable-cell';
import {
  ArrowUpRight,
  MapPin,
  Phone,
  Mail,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { updateClient, bulkDeleteClients } from '@/lib/actions/clients';
import { cn, onEnterSpace } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useConfirm } from '@/components/ui/use-confirm';
import { TableToolbar, useTablePrefs } from '@/components/ui/table-enhancements';
import BulkActionsBar from '@/components/sophistication/bulk-actions-bar';

interface EnrichedClient {
  id: string;
  business_name: string;
  primary_contact_person: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  pan: string | null;
  gstin: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  group_id: string | null;
  group_name: string | null;
  engagements: number;
  compliance: { open: number; overdue: number };
}

function CompliancePill({ open, overdue }: { open: number; overdue: number }) {
  if (overdue > 0) return <span className="tff-pill tff-pill-bad tff-pill-dot">{overdue} overdue</span>;
  if (open > 0) return <span className="tff-pill tff-pill-accent tff-pill-dot">{open} open</span>;
  return <span className="tff-pill tff-pill-good tff-pill-dot">Up to date</span>;
}

export default function ClientsTableClient({
  clients,
  groups,
  canDelete = false,
}: {
  clients: EnrichedClient[];
  groups?: { id: string; name: string }[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const search = searchParams.get('q') ?? '';
  const [sortKey, setSortKey] = useState<'name' | 'engagements' | 'group'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [ConfirmDialog, confirm] = useConfirm();
  const { density, setDensity } = useTablePrefs('team-clients', [], 'comfortable');
  const parentRef = useRef<HTMLDivElement>(null);

  const onSearch = useDebouncedCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    const v = e.target.value.trim();
    if (v) params.set('q', v);
    else params.delete('q');
    params.delete('page');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }, 300);

  const groupOptions = useMemo(() => {
    const map = new Map<string, string>();
    (groups ?? []).forEach((g) => map.set(g.id, g.name));
    clients.forEach((c) => {
      if (c.group_id && !map.has(c.group_id)) {
        map.set(c.group_id, c.group_name ?? 'Unknown');
      }
    });
    const opts = Array.from(map.entries()).map(([id, name]) => ({
      value: id,
      label: name,
      color: 'outline' as const,
    }));
    return [{ value: '__none__', label: '—', color: 'outline' as const }, ...opts];
  }, [groups, clients]);

  const filtered = useMemo(() => {
    let data = [...clients];
    data.sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === 'name') {
        va = a.business_name;
        vb = b.business_name;
      } else if (sortKey === 'engagements') {
        va = a.engagements;
        vb = b.engagements;
      } else if (sortKey === 'group') {
        va = a.group_name ?? '';
        vb = b.group_name ?? '';
      }
      if (va === null || va === undefined) va = '';
      if (vb === null || vb === undefined) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [clients, sortKey, sortDir]);

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => density === 'compact' ? 44 : 56,
    overscan: 8,

  });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleUpdateGroup = useCallback(
    async (clientId: string, newValue: string) => {
      const r = await updateClient({
        id: clientId,
        group_id: newValue === '__none__' ? '' : newValue,
      });
      if (r.success) {
        router.refresh();
        return true;
      }
      toast.error(r.error ?? 'Failed to update group');
      return false;
    },
    [router]
  );

  function toggleOne(e: { stopPropagation(): void }, id: string) {
    e.stopPropagation();
    const ns = new Set(selectedIds);
    if (ns.has(id)) ns.delete(id);
    else ns.add(id);
    setSelectedIds(ns);
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((c) => c.id)));
  }

  async function bulkDelete(ids: string[]) {
    const ok = await confirm({
      title: 'Delete Clients',
      description: `Are you sure you want to delete ${ids.length} client(s)?`,
    });
    if (!ok) return { success: 0, failed: 0 };

    const result = await bulkDeleteClients({ clientIds: ids });
    if (!result.success) throw new Error(result.error);
    setSelectedIds(new Set());
    toast.success(`Deleted ${ids.length} clients`);
    return { success: ids.length, failed: 0 };
  }

  function SortIcon({ col }: { col: typeof sortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-zinc-300" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-teal-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-teal-600" />
    );
  }

  return (
    <div className="space-y-3">
      <ConfirmDialog />
      {canDelete && (
        <BulkActionsBar
          ids={Array.from(selectedIds)}
          onClear={() => setSelectedIds(new Set())}
          actions={[
            {
              type: 'button',
              label: 'Delete clients',
              icon: Trash2,
              variant: 'danger',
              onApply: bulkDelete,
            },
          ]}
        />
      )}
      {/* Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search name or PAN"
            defaultValue={search}
            onChange={onSearch}
            className="pl-9 pr-3 h-9 rounded-lg border border-zinc-200 bg-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 w-72"
          />
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <TableToolbar
            columns={[]}
            onColumnsChange={() => {}}
            density={density}
            onDensityChange={setDensity}
          />
          <div className="text-sm text-zinc-500">
            {clients.length} clients
          </div>
        </div>
      </div>

      {/* Virtual scroll container */}
      <div ref={parentRef} className="overflow-auto rounded-xl border border-zinc-200 bg-white" style={{ height: 'calc(100vh - 280px)', minHeight: '420px' }}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-zinc-600 bg-zinc-50 border-b border-zinc-200">
          <div className="col-span-1 flex items-center">
            <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} aria-label="Select all" />
          </div>
          <button
            className="col-span-4 text-left flex items-center gap-1 hover:text-zinc-600 transition-colors"
            onClick={() => toggleSort('name')}
          >
            Client <SortIcon col="name" />
          </button>
          <button
            className="col-span-2 text-left flex items-center gap-1 hover:text-zinc-600 transition-colors"
            onClick={() => toggleSort('group')}
          >
            Group <SortIcon col="group" />
          </button>
          <div className="col-span-2 text-left">Compliance</div>
          <button
            className="col-span-2 text-left flex items-center gap-1 hover:text-zinc-600 transition-colors"
            onClick={() => toggleSort('engagements')}
          >
            Work <SortIcon col="engagements" />
          </button>
          <div className="col-span-1 text-right">View</div>
        </div>

        {/* Virtual body */}
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const c = filtered[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="absolute left-0 w-full"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <DockLink
                  item={{ type: 'client', id: c.id }}
                  href={`/team/clients/${c.id}`}
                  className="block w-full"
                >
                  <div
                    className={cn(
                      'group grid grid-cols-12 gap-4 items-center px-4 border-b border-zinc-100 transition-colors cursor-pointer hover:bg-zinc-50',
                      density === 'compact' ? 'py-1.5' : 'py-2.5',
                      selectedIds.has(c.id) ? 'ring-2 ring-teal-500' : '',
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      role="button"
                      tabIndex={0}
                      className="col-span-1 flex items-center"
                      onClick={(e) => toggleOne(e, c.id)}
                      onKeyDown={onEnterSpace(() => toggleOne({ stopPropagation: () => {} }, c.id))}
                      aria-label={selectedIds.has(c.id) ? 'Deselect client' : 'Select client'}
                    >
                      <Checkbox checked={selectedIds.has(c.id)} />
                    </div>

                    {/* Client info */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <ClientHoverCard clientId={c.id}>
                          <div className="text-sm font-medium text-zinc-900 truncate">
                            {c.business_name}
                          </div>
                        </ClientHoverCard>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                          {c.city && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {c.city}
                            </span>
                          )}
                          {c.primary_contact_phone && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="h-3 w-3" />
                              {c.primary_contact_phone}
                            </span>
                          )}
                          {c.primary_contact_email && (
                            <span className="flex items-center gap-0.5">
                              <Mail className="h-3 w-3" />
                              {c.primary_contact_email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Group — inline editable */}
                    <div
                      role="button"
                      tabIndex={0}
                      className="col-span-2"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); } }}
                      aria-label="Edit group"
                    >
                      <EditableCell
                        value={c.group_id ?? '__none__'}
                        options={groupOptions}
                        onSave={(val) => handleUpdateGroup(c.id, val)}
                        type="text"
                      />
                    </div>

                    {/* Compliance health */}
                    <div className="col-span-2">
                      <CompliancePill open={c.compliance.open} overdue={c.compliance.overdue} />
                    </div>

                    {/* Engagements */}
                    <div className="col-span-2">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                          c.engagements > 0 ? 'bg-teal-50 text-teal-600' : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {c.engagements}
                      </span>
                    </div>

                    {/* View arrow */}
                    <div className="col-span-1 flex justify-end">
                      <div className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                        <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-teal-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                </DockLink>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
