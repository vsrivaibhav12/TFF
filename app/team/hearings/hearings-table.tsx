'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Hearing {
  id: string;
  hearing_type?: string;
  subject?: string;
  hearing_scheduled_date?: string;
  officer_name?: string;
  status: string;
  venue?: string;
  clients?: { business_name: string } | null;
}

export default function HearingsTable({ hearings }: { hearings: Hearing[] }) {
  const [sortKey, setSortKey] = useState<string>('hearing_scheduled_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    const data = [...hearings];
    data.sort((a, b) => {
      let va: any = a[sortKey as keyof Hearing];
      let vb: any = b[sortKey as keyof Hearing];
      if (sortKey === 'client') {
        va = a.clients?.business_name ?? '';
        vb = b.clients?.business_name ?? '';
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
  }, [hearings, sortKey, sortDir]);

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
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('hearing_type')}>
                <span className="flex items-center gap-1">Type <SortIcon col="hearing_type" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('subject')}>
                <span className="flex items-center gap-1">Subject <SortIcon col="subject" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('hearing_scheduled_date')}>
                <span className="flex items-center gap-1">Scheduled <SortIcon col="hearing_scheduled_date" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('officer_name')}>
                <span className="flex items-center gap-1">Officer <SortIcon col="officer_name" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((h) => (
              <TableRow key={h.id} data-testid={`hearing-row-${h.id}`}>
                <TableCell className="font-medium">{h.clients?.business_name}</TableCell>
                <TableCell><Badge variant="outline">{h.hearing_type ?? '—'}</Badge></TableCell>
                <TableCell className="max-w-xs truncate">{h.subject ?? '—'}</TableCell>
                <TableCell>{formatDateIST(h.hearing_scheduled_date)}</TableCell>
                <TableCell>{h.officer_name ?? '—'}</TableCell>
                <TableCell><Badge variant={h.status === 'concluded' ? 'success' : 'warning'}>{h.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
