'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST } from '@/lib/utils';
import {
  getClientVisibleStatus,
  CLIENT_VISIBLE_LABELS,
  CLIENT_VISIBLE_VARIANTS,
} from '@/lib/services/client-visible-status';
import { ArrowUpDown, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';

interface PortalTask {
  id: string;
  title: string;
  due_date?: string;
  status: string;
  clients?: { business_name: string } | null;
}

export default function PortalTasksTable({ tasks }: { tasks: PortalTask[] }) {
  const [sortKey, setSortKey] = useState<string>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    const data = [...tasks];
    data.sort((a, b) => {
      let va: any = a[sortKey as keyof PortalTask];
      let vb: any = b[sortKey as keyof PortalTask];
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
  }, [tasks, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-stone-300" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-teal-600" /> : <ArrowDown className="h-3 w-3 text-teal-600" />;
  }

  return (
    <div className="tff-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-stone-50/50">
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('title')}>
                <span className="flex items-center gap-1">Task <SortIcon col="title" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('due_date')}>
                <span className="flex items-center gap-1">Due date <SortIcon col="due_date" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
              </TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((t) => {
              const cs = getClientVisibleStatus(t);
              return (
                <TableRow key={t.id} data-testid={`portal-task-row-${t.id}`} data-row>
                  <TableCell>
                    <Link
                      href={`/portal/tasks/${t.id}`}
                      className="font-medium text-stone-900 hover:text-teal-700 transition-colors"
                    >
                      {t.title}
                    </Link>
                    {t.clients?.business_name && (
                      <div className="text-xs text-stone-500 mt-0.5">{t.clients.business_name}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-stone-600">{formatDateIST(t.due_date)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={CLIENT_VISIBLE_VARIANTS[cs] as any}
                      data-testid={`portal-task-status-${t.id}`}
                    >
                      {CLIENT_VISIBLE_LABELS[cs]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4 text-stone-300" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
