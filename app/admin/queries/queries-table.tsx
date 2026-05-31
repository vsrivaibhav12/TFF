'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, Building2, User } from 'lucide-react';
import BulkActionsBar from '@/components/sophistication/bulk-actions-bar';
import { updateQueryStatusAction } from '@/lib/actions/queries';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import { Search } from 'lucide-react';

interface Query {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  clients?: { business_name: string } | null;
  users_profile?: { full_name: string | null } | null;
}

export default function QueriesTable({ queries, total, page, limit }: { queries: Query[]; total: number; page: number; limit: number }) {
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [searchInput, setSearchInput] = useState(searchParams.get('query') || '');

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

  return (
    <>
      <form onSubmit={handleSearch} className="flex mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search queries..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 pr-3 h-9 w-full rounded-md border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
        />
      </form>
      <div className="tff-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('subject')}>
                  <span className="flex items-center gap-1">Subject &amp; client <SortIcon col="subject" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('raised_by')}>
                  <span className="flex items-center gap-1">Raised by <SortIcon col="raised_by" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-center" onClick={() => toggleSort('status')}>
                  <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                  <span className="flex items-center gap-1">Date <SortIcon col="created_at" /></span>
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((q) => (
                <TableRow key={q.id} className={selected.has(q.id) ? 'bg-teal-50/40' : ''} data-row>
                  <TableCell>
                    <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggle(q.id)} aria-label={`Select query ${q.subject}`} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/queries/${q.id}`} className="font-medium text-zinc-900 hover:text-teal-700">
                      {q.subject}
                    </Link>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">{q.clients?.business_name ?? '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-700">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-zinc-400" />
                      {q.users_profile?.full_name ?? 'Client user'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={q.status === 'resolved' ? 'success' : 'warning'}>{q.status}</Badge>
                  </TableCell>
                  <TableCell className="text-zinc-700 tabular-nums">{formatDateIST(q.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/queries/${q.id}`}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                      aria-label="Open query"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
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
    </>
  );
}
