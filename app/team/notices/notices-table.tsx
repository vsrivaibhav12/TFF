'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST, formatCurrencyINR } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Notice {
  id: string;
  notice_type: string;
  notice_number?: string;
  subject?: string;
  due_date?: string;
  amount_involved?: number;
  status: string;
  clients?: { business_name: string } | null;
}

export default function NoticesTable({ notices }: { notices: Notice[] }) {
  const [sortKey, setSortKey] = useState<string>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    const data = [...notices];
    data.sort((a, b) => {
      let va: any = a[sortKey as keyof Notice];
      let vb: any = b[sortKey as keyof Notice];
      if (sortKey === 'client') {
        va = a.clients?.business_name ?? '';
        vb = b.clients?.business_name ?? '';
      }
      if (sortKey === 'amount') {
        va = a.amount_involved ?? 0;
        vb = b.amount_involved ?? 0;
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
  }, [notices, sortKey, sortDir]);

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

  return (
    <div className="tff-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('client')}>
                <span className="flex items-center gap-1">Client <SortIcon col="client" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('notice_type')}>
                <span className="flex items-center gap-1">Type <SortIcon col="notice_type" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('notice_number')}>
                <span className="flex items-center gap-1">Number <SortIcon col="notice_number" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('subject')}>
                <span className="flex items-center gap-1">Subject <SortIcon col="subject" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('due_date')}>
                <span className="flex items-center gap-1">Due <SortIcon col="due_date" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                <span className="flex items-center gap-1">Amount <SortIcon col="amount" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((n) => (
              <TableRow key={n.id} data-testid={`notice-row-${n.id}`}>
                <TableCell className="font-medium">{n.clients?.business_name}</TableCell>
                <TableCell><Badge variant="outline">{n.notice_type}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{n.notice_number ?? '—'}</TableCell>
                <TableCell className="max-w-xs truncate">{n.subject ?? '—'}</TableCell>
                <TableCell>{formatDateIST(n.due_date)}</TableCell>
                <TableCell className="tabular-nums">{formatCurrencyINR(n.amount_involved, { compact: true })}</TableCell>
                <TableCell><Badge variant={n.status === 'closed' ? 'success' : 'warning'}>{n.status.replace(/_/g, ' ')}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
