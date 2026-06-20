'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { DockLink } from '@/components/shell/dock-link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { getStatusColour } from '@/lib/semantic-colours';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExpandableCell } from '@/components/ui/expandable-cell';
import { ResizableTableHead } from '@/components/ui/resizable-table-head';
import { useColumnWidths } from '@/lib/hooks/use-column-widths';
import { formatDateIST, cn } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, Building2, User, Search } from 'lucide-react';
import BulkActionsBar from '@/components/sophistication/bulk-actions-bar';
import { updateQueryStatusAction } from '@/lib/actions/queries';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import { TableToolbar, useTablePrefs } from '@/components/ui/table-enhancements';

interface Query {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  clients?: { business_name: string } | null;
  users_profile?: { full_name: string | null } | null;
}

const DEFAULT_COLUMNS = [
  { key: 'select', label: 'Select', visible: true, optional: false },
  { key: 'subject', label: 'Subject & client', visible: true, optional: false },
  { key: 'raised_by', label: 'Raised by', visible: true, optional: true },
  { key: 'status', label: 'Status', visible: true, optional: false },
  { key: 'created_at', label: 'Date', visible: true, optional: true },
  { key: 'actions', label: 'Actions', visible: true, optional: false },
];

export default function QueriesTable({ queries, total, page, limit }: { queries: Query[]; total: number; page: number; limit: number }) {
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [searchInput, setSearchInput] = useState(searchParams.get('query') || '');
  const { columns, setColumns, density, setDensity } = useTablePrefs('admin-queries', DEFAULT_COLUMNS, 'comfortable');
  const { widths, setWidth, loaded } = useColumnWidths('admin-queries', {
    select: 44,
    subject: 320,
    raised_by: 150,
    status: 110,
    created_at: 110,
    actions: 60,
  });

  const sorted = useMemo(() => {
    const data = [...queries];
    data.sort((a, b) => {
      let va: any = a[sortKey as keyof Query];
      let vb: any = b[sortKey as keyof Query];
      if (sortKey === 'client') {
        va = a.clients?.business_name ?? '';
        vb = b.clients?.business_name ?? '';
      }
      if (sortKey === 'raised_by') {
        va = a.users_profile?.full_name ?? '';
        vb = b.users_profile?.full_name ?? '';
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
  }, [queries, sortKey, sortDir]);

  const allSelected = sorted.length > 0 && selected.size === sorted.length;

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-zinc-300" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-teal-600" /> : <ArrowDown className="h-3 w-3 text-teal-600" />;
  }

  function toggle(id: string) {
    const ns = new Set(selected);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setSelected(ns);
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(sorted.map((q) => q.id)));
  }

  async function bulkChangeStatus(ids: string[], status?: string) {
    let success = 0, failed = 0;
    await Promise.all(
      ids.map(async (id) => {
        const r = await updateQueryStatusAction({ query_id: id, status: status as any });
        if (r.success) success++; else failed++;
      })
    );
    if (failed > 0) toast.warning(`${success} updated, ${failed} failed`);
    else toast.success(`${success} queries updated`);
    setSelected(new Set());
    return { success, failed };
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput) {
      params.set('query', searchInput);
    } else {
      params.delete('query');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }

  const colVisible = (key: string) => columns.find((c) => c.key === key)?.visible ?? true;
  const rowPadding = density === 'compact' ? 'py-1.5' : 'py-3';

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search queries..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-3 h-9 w-full rounded-md border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
          />
        </form>
        <TableToolbar
          columns={columns}
          onColumnsChange={setColumns}
          density={density}
          onDensityChange={setDensity}
        />
      </div>
      <div className="tff-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]" style={{ tableLayout: 'fixed' }}>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                {colVisible('select') && (
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                  </TableHead>
                )}
                {colVisible('subject') && (
                  <ResizableTableHead className="cursor-pointer select-none" width={loaded ? widths.subject : undefined} onResize={(w) => setWidth('subject', w)} onClick={() => toggleSort('subject')}>
                    <span className="flex items-center gap-1">Subject &amp; client <SortIcon col="subject" /></span>
                  </ResizableTableHead>
                )}
                {colVisible('raised_by') && (
                  <ResizableTableHead className="cursor-pointer select-none" width={loaded ? widths.raised_by : undefined} onResize={(w) => setWidth('raised_by', w)} onClick={() => toggleSort('raised_by')}>
                    <span className="flex items-center gap-1">Raised by <SortIcon col="raised_by" /></span>
                  </ResizableTableHead>
                )}
                {colVisible('status') && (
                  <ResizableTableHead className="cursor-pointer select-none text-center" width={loaded ? widths.status : undefined} onResize={(w) => setWidth('status', w)} onClick={() => toggleSort('status')}>
                    <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
                  </ResizableTableHead>
                )}
                {colVisible('created_at') && (
                  <ResizableTableHead className="cursor-pointer select-none" width={loaded ? widths.created_at : undefined} onResize={(w) => setWidth('created_at', w)} onClick={() => toggleSort('created_at')}>
                    <span className="flex items-center gap-1">Date <SortIcon col="created_at" /></span>
                  </ResizableTableHead>
                )}
                {colVisible('actions') && (
                  <TableHead></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((q) => (
                <TableRow key={q.id} className={selected.has(q.id) ? 'bg-teal-50/40' : ''} data-row>
                  {colVisible('select') && (
                    <TableCell className={rowPadding}>
                      <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggle(q.id)} aria-label={`Select query ${q.subject}`} />
                    </TableCell>
                  )}
                  {colVisible('subject') && (
                    <TableCell className={rowPadding}>
                      <DockLink item={{ type: 'query', id: q.id }} href={`/admin/queries/${q.id}`} className="block">
                        <ExpandableCell className="font-medium text-zinc-900 hover:text-teal-700 max-w-[300px]" maxLines={1}>
                          {q.subject}
                        </ExpandableCell>
                      </DockLink>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <ExpandableCell className="max-w-[200px]" maxLines={1}>
                          {q.clients?.business_name ?? '—'}
                        </ExpandableCell>
                      </div>
                    </TableCell>
                  )}
                  {colVisible('raised_by') && (
                    <TableCell className={cn('text-zinc-700', rowPadding)}>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-zinc-400" />
                        {q.users_profile?.full_name ?? 'Client user'}
                      </div>
                    </TableCell>
                  )}
                  {colVisible('status') && (
                    <TableCell className={cn('text-center', rowPadding)}>
                      <Badge className={cn(getStatusColour(q.status).bg, getStatusColour(q.status).text, getStatusColour(q.status).border)}><span className={cn('h-1.5 w-1.5 rounded-full', getStatusColour(q.status).dot)} />{q.status}</Badge>
                    </TableCell>
                  )}
                  {colVisible('created_at') && (
                    <TableCell className={cn('text-zinc-700 tabular-nums', rowPadding)}>{formatDateIST(q.created_at)}</TableCell>
                  )}
                  {colVisible('actions') && (
                    <TableCell className={cn('text-right', rowPadding)}>
                      <DockLink
                        item={{ type: 'query', id: q.id }}
                        href={`/admin/queries/${q.id}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                        aria-label="Open query"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </DockLink>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Pagination page={page} total={total} limit={limit} />
      <BulkActionsBar
        ids={[...selected]}
        onClear={() => setSelected(new Set())}
        actions={[
          {
            type: 'select',
            label: 'Set status',
            options: [
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ],
            onApply: bulkChangeStatus,
          },
        ]}
      />
    </div>
  );
}
