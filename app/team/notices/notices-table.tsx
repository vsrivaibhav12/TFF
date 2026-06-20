'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { getStatusColour } from '@/lib/semantic-colours';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExpandableCell } from '@/components/ui/expandable-cell';
import { ResizableTableHead } from '@/components/ui/resizable-table-head';
import { useColumnWidths } from '@/lib/hooks/use-column-widths';
import { formatDateIST, formatCurrencyINR } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { DockLink } from '@/components/shell/dock-link';
import { TableToolbar, useTablePrefs } from '@/components/ui/table-enhancements';
import { cn } from '@/lib/utils';

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

const DEFAULT_COLUMNS = [
  { key: 'client', label: 'Client', visible: true, optional: true },
  { key: 'notice_type', label: 'Type', visible: true, optional: true },
  { key: 'notice_number', label: 'Number', visible: true, optional: true },
  { key: 'subject', label: 'Subject', visible: true, optional: false },
  { key: 'due_date', label: 'Due', visible: true, optional: true },
  { key: 'amount', label: 'Amount', visible: true, optional: true },
  { key: 'status', label: 'Status', visible: true, optional: false },
];

export default function NoticesTable({ notices }: { notices: Notice[] }) {
  const [sortKey, setSortKey] = useState<string>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const { columns, setColumns, density, setDensity } = useTablePrefs('team-notices', DEFAULT_COLUMNS, 'comfortable');
  const { widths, setWidth, loaded } = useColumnWidths('team-notices', {
    client: 170,
    notice_type: 110,
    notice_number: 130,
    subject: 260,
    due_date: 95,
    amount: 100,
    status: 120,
  });

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

  const colVisible = (key: string) => columns.find((c) => c.key === key)?.visible ?? true;
  const rowPadding = density === 'compact' ? 'py-1.5' : 'py-3';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
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
                {colVisible('client') && (
                  <ResizableTableHead className="cursor-pointer select-none" width={loaded ? widths.client : undefined} onResize={(w) => setWidth('client', w)} onClick={() => toggleSort('client')}>
                    <span className="flex items-center gap-1">Client <SortIcon col="client" /></span>
                  </ResizableTableHead>
                )}
                {colVisible('notice_type') && (
                  <ResizableTableHead className="cursor-pointer select-none" width={loaded ? widths.notice_type : undefined} onResize={(w) => setWidth('notice_type', w)} onClick={() => toggleSort('notice_type')}>
                    <span className="flex items-center gap-1">Type <SortIcon col="notice_type" /></span>
                  </ResizableTableHead>
                )}
                {colVisible('notice_number') && (
                  <ResizableTableHead className="cursor-pointer select-none" width={loaded ? widths.notice_number : undefined} onResize={(w) => setWidth('notice_number', w)} onClick={() => toggleSort('notice_number')}>
                    <span className="flex items-center gap-1">Number <SortIcon col="notice_number" /></span>
                  </ResizableTableHead>
                )}
                {colVisible('subject') && (
                  <ResizableTableHead className="cursor-pointer select-none" width={loaded ? widths.subject : undefined} onResize={(w) => setWidth('subject', w)} onClick={() => toggleSort('subject')}>
                    <span className="flex items-center gap-1">Subject <SortIcon col="subject" /></span>
                  </ResizableTableHead>
                )}
                {colVisible('due_date') && (
                  <ResizableTableHead className="cursor-pointer select-none" width={loaded ? widths.due_date : undefined} onResize={(w) => setWidth('due_date', w)} onClick={() => toggleSort('due_date')}>
                    <span className="flex items-center gap-1">Due <SortIcon col="due_date" /></span>
                  </ResizableTableHead>
                )}
                {colVisible('amount') && (
                  <ResizableTableHead className="cursor-pointer select-none" width={loaded ? widths.amount : undefined} onResize={(w) => setWidth('amount', w)} onClick={() => toggleSort('amount')}>
                    <span className="flex items-center gap-1">Amount <SortIcon col="amount" /></span>
                  </ResizableTableHead>
                )}
                {colVisible('status') && (
                  <ResizableTableHead className="cursor-pointer select-none" width={loaded ? widths.status : undefined} onResize={(w) => setWidth('status', w)} onClick={() => toggleSort('status')}>
                    <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
                  </ResizableTableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((n) => (
                <TableRow key={n.id} data-testid={`notice-row-${n.id}`}>
                  {colVisible('client') && (
                    <TableCell className={cn('font-medium', rowPadding)}>
                      <DockLink item={{ type: 'notice', id: n.id }} href={`/team/notices/${n.id}`} className="block">
                        <ExpandableCell className="max-w-[200px]" maxLines={1}>
                          {n.clients?.business_name}
                        </ExpandableCell>
                      </DockLink>
                    </TableCell>
                  )}
                  {colVisible('notice_type') && (
                    <TableCell className={rowPadding}><Badge variant="outline">{n.notice_type}</Badge></TableCell>
                  )}
                  {colVisible('notice_number') && (
                    <TableCell className={cn('font-mono text-xs', rowPadding)}>{n.notice_number ?? '—'}</TableCell>
                  )}
                  {colVisible('subject') && (
                    <TableCell className={rowPadding}>
                      <DockLink item={{ type: 'notice', id: n.id }} href={`/team/notices/${n.id}`} className="block">
                        <ExpandableCell className="max-w-[250px]" maxLines={1}>
                          {n.subject ?? '—'}
                        </ExpandableCell>
                      </DockLink>
                    </TableCell>
                  )}
                  {colVisible('due_date') && (
                    <TableCell className={rowPadding}>{formatDateIST(n.due_date)}</TableCell>
                  )}
                  {colVisible('amount') && (
                    <TableCell className={cn('tabular-nums', rowPadding)}>{formatCurrencyINR(n.amount_involved, { compact: true })}</TableCell>
                  )}
                  {colVisible('status') && (
                    <TableCell className={rowPadding}><Badge className={cn(getStatusColour(n.status).bg, getStatusColour(n.status).text, getStatusColour(n.status).border)}><span className={cn('h-1.5 w-1.5 rounded-full', getStatusColour(n.status).dot)} />{n.status.replace(/_/g, ' ')}</Badge></TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
