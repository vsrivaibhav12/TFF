'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { convertToCsv } from '@/lib/csv-utils';
import { exportTableDataToExcelAction } from '@/lib/actions/export';

export interface ExportDataset {
  /** Shown in the menu, for example "Daily log". */
  label: string;
  /** File name without extension. */
  filename: string;
  /** Excel sheet name. */
  sheetName?: string;
  rows: Record<string, string | number | null>[];
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export menu for reports. Each dataset can be downloaded as CSV or Excel, and an empty
 * dataset says so instead of silently doing nothing. Exports contain every row in the
 * current filter, not only the page on screen.
 */
export function ReportExport({ datasets }: { datasets: ExportDataset[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function run(ds: ExportDataset, kind: 'csv' | 'xlsx') {
    if (ds.rows.length === 0) {
      toast.info(`Nothing to export for ${ds.label.toLowerCase()} in this range`);
      return;
    }
    const id = `${ds.filename}:${kind}`;
    setBusy(id);
    try {
      if (kind === 'csv') {
        // Leading BOM so Excel opens non-English names correctly.
        save(new Blob(['﻿' + convertToCsv(ds.rows)], { type: 'text/csv;charset=utf-8' }), `${ds.filename}.csv`);
      } else {
        const r = await exportTableDataToExcelAction(ds.rows, ds.sheetName ?? 'Report');
        if (!r.success) {
          toast.error(r.error || 'Excel export failed');
          return;
        }
        const bytes = Uint8Array.from(atob(r.data.base64), (c) => c.charCodeAt(0));
        save(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${ds.filename}.xlsx`);
      }
      toast.success(`Exported ${ds.rows.length} row${ds.rows.length === 1 ? '' : 's'}`);
      setOpen(false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" data-testid="report-export">
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <ul className="space-y-1">
          {datasets.map((ds) => (
            <li key={ds.filename} className="rounded-lg p-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-zinc-900">{ds.label}</span>
                <span className="text-xs text-zinc-500 tabular-nums">{ds.rows.length} rows</span>
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" disabled={busy !== null} onClick={() => run(ds, 'csv')}>
                  {busy === `${ds.filename}:csv` ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1" />} CSV
                </Button>
                <Button size="sm" variant="outline" className="flex-1" disabled={busy !== null} onClick={() => run(ds, 'xlsx')}>
                  {busy === `${ds.filename}:xlsx` ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />} Excel
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
