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
  Building2,
  MapPin,
  Phone,
  Mail,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useConfirm } from '@/components/ui/use-confirm';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { bulkDeleteClients, updateClient } from '@/lib/actions/clients';
import BulkAssignSubService from '@/components/clients/bulk-assign-subservice';
import BulkActionsBar from '@/components/sophistication/bulk-actions-bar';
import { cn } from '@/lib/utils';
import { TableToolbar, useTablePrefs } from '@/components/ui/table-enhancements';
import { ComplianceHealthBar } from '@/components/clients/compliance-health';

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
  portal_enabled: boolean;
  created_at: string;
  group_id: string | null;
  group_name: string | null;
  engagements: number;
  compliance: { gst: string; tds: string; it: string };
  complianceHealth: number;
}

function ComplianceDot({ status }: { status: string }) {
  const color =
    status === 'filed' || status === 'completed'
      ? 'bg-teal-500'
      : status === 'overdue'
        ? 'bg-red-500'
        : status === 'in_progress' || status === 'processing'
          ? 'bg-amber-500'
          : 'bg-zinc-200';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={status} />;
}

function ComplianceDots({ gst, tds, it }: { gst: string; tds: string; it: string }) {
  return (
    <div className="flex items-center gap-1.5" title={`GST: ${gst} | TDS: ${tds} | IT: ${it}`}>
      <span className="text-[10px] text-zinc-400 uppercase font-medium">G</span>
      <ComplianceDot status={gst} />
      <span className="text-[10px] text-zinc-400 uppercase font-medium ml-1">T</span>
      <ComplianceDot status={tds} />
      <span className="text-[10px] text-zinc-400 uppercase font-medium ml-1">I</span>
      <ComplianceDot status={it} />
    </div>
  );
}

export default function ClientsTableClient({
  clients,
  showBulkAssign = false,
  groups,
}: {
  clients: EnrichedClient[];
  showBulkAssign?: boolean;
  groups?: { id: string; name: string }[];
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
  const { density, setDensity } = useTablePrefs('admin-clients', [], 'comfortable');
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
    estimateSize: () => density === 'compact' ? 52 : 68,
    overscan: 8,

  });

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  }

  const toggleOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
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

  function SortIcon({ col }: { col: typeof sortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-zinc-300" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-teal-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-teal-600" />
    );
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog />
      <BulkActionsBar
        ids={Array.from(selectedIds)}
        onClear={() => setSelectedIds(new Set())}
        actions={[
          {
            type: 'button',
            label: 'Delete clients',
            icon: Trash2,
            variant: 'danger',
            onApply: async () => {
              const ok = await confirm({
                title: 'Delete Clients',
                description: `Are you sure you want to delete ${selectedIds.size} client(s)?`,
              });
              if (!ok) return { success: 0, failed: 0 };

              const result = await bulkDeleteClients({ clientIds: Array.from(selectedIds) });
              if (!result.success) throw new Error(result.error);
              return { success: selectedIds.size, failed: 0 };
            },
          },
        ]}
      >
        {showBulkAssign && (
          <BulkAssignSubService
            selectedClientIds={Array.from(selectedIds)}
            onDone={() => setSelectedIds(new Set())}
          />
        )}
      </BulkActionsBar>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search clients…"
            defaultValue={search}
            onChange={onSearch}
            className="pl-9 pr-3 h-9 rounded-md border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 w-60"
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
      <div ref={parentRef} className="overflow-auto rounded-xl border border-zinc-200" style={{ height: '60vh' }}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 grid grid-cols-[auto_1fr_auto_auto_auto_auto] md:grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 bg-white/80 backdrop-blur-sm border-b border-zinc-200">
          <div className="col-span-1 md:col-span-1 flex items-center">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          </div>
          <button
            className="col-span-4 text-left flex items-center gap-1 hover:text-zinc-600 transition-colors"
            onClick={() => toggleSort('name')}
          >
            Client <SortIcon col="name" />
          </button>
          <button
            className="col-span-2 text-left hidden md:flex items-center gap-1 hover:text-zinc-600 transition-colors"
            onClick={() => toggleSort('group')}
          >
            Group <SortIcon col="group" />
          </button>
          <div className="col-span-2 text-left hidden md:block">Compliance</div>
          <button
            className="col-span-2 text-left hidden md:flex items-center gap-1 hover:text-zinc-600 transition-colors"
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
            const hasOverdue = c.compliance.gst === 'overdue' || c.compliance.tds === 'overdue' || c.compliance.it === 'overdue';
            const hasInProgress = c.compliance.gst === 'in_progress' || c.compliance.gst === 'processing' || c.compliance.tds === 'in_progress' || c.compliance.tds === 'processing' || c.compliance.it === 'in_progress' || c.compliance.it === 'processing';
            const leftBorder = hasOverdue
              ? 'border-l-2 border-l-red-500'
              : hasInProgress
                ? 'border-l-2 border-l-amber-500'
                : c.engagements > 0
                  ? 'border-l-2 border-l-teal-500'
                  : '';
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="absolute left-0 w-full px-4 py-1"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <DockLink
                  item={{ type: 'client', id: c.id }}
                  href={`/admin/clients/${c.id}`}
                  className="block w-full"
                >
                  <div
                    className={cn(
                      'group grid grid-cols-[auto_1fr_auto_auto_auto_auto] md:grid-cols-12 gap-4 items-center px-4 rounded-xl bg-white border border-zinc-200 transition-colors cursor-pointer',
                      density === 'compact' ? 'py-2' : 'py-3',
                      selectedIds.has(c.id) ? 'ring-2 ring-teal-500' : 'hover:bg-zinc-50/60',
                      leftBorder
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      className="col-span-1 md:col-span-1 flex items-center"
                      onClick={(e) => toggleOne(e, c.id)}
                    >
                      <Checkbox checked={selectedIds.has(c.id)} />
                    </div>

                    {/* Client info */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <ClientHoverCard clientId={c.id}>
                          <div className="text-sm font-medium text-zinc-900 truncate">
                            {c.business_name}
                          </div>
                        </ClientHoverCard>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
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
                      className="col-span-2 hidden md:block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EditableCell
                        value={c.group_id ?? '__none__'}
                        options={groupOptions}
                        onSave={(val) => handleUpdateGroup(c.id, val)}
                        type="text"
                      />
                    </div>

                    {/* Compliance health */}
                    <div className="col-span-2 hidden md:block">
                      <ComplianceHealthBar gst={c.compliance.gst} tds={c.compliance.tds} it={c.compliance.it} />
                    </div>

                    {/* Engagements */}
                    <div className="col-span-2 hidden md:block">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold tabular-nums ${
                          c.engagements > 0 ? 'bg-teal-50 text-teal-600' : 'bg-zinc-100 text-zinc-400'
                        }`}
                      >
                        {c.engagements}
                      </span>
                    </div>

                    {/* View arrow */}
                    <div className="col-span-1 flex justify-end">
                      <div className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                        <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-teal-600 transition-colors" />
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
