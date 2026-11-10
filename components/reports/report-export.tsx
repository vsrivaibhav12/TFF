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
  /** Rows already on the page. Use `load` instead when the page only holds part of the data. */
  rows?: Record<string, string | number | null>[];
  /** Fetches every matching row when the user clicks, so a paged list exports all of it. */
  load?: () => Promise<{ rows: Record<string, string | number | null>[]; truncated?: boolean } | { error: string }>;
  /** Shown instead of a row count, for example "All 1,078 matching tasks". */
  hint?: string;
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
    const id = `${ds.filename}:${kind}`;
    setBusy(id);
    try {
      let rows = ds.rows ?? [];
      let truncated = false;
      if (ds.load) {
        const loaded = await ds.load();
        if ('error' in loaded) {
          toast.error(loaded.error);
          return;
        }
        rows = loaded.rows;
        truncated = !!loaded.truncated;
      }
      if (rows.length === 0) {
        toast.info(`Nothing to export for ${ds.label.toLowerCase()}`);
        return;
      }
      if (kind === 'csv') {
        // Leading BOM so Excel opens non-English names correctly.
        save(new Blob(['﻿' + convertToCsv(rows)], { type: 'text/csv;charset=utf-8' }), `${ds.filename}.csv`);
      } else {
        const r = await exportTableDataToExcelAction(rows, ds.sheetName ?? 'Report');
        if (!r.success) {
          toast.error(r.error || 'Excel export failed');
          return;
        }
        const bytes = Uint8Array.from(atob(r.data.base64), (c) => c.charCodeAt(0));
        save(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${ds.filename}.xlsx`);
      }
      toast.success(`Exported ${rows.length} row${rows.length === 1 ? '' : 's'}`);
      if (truncated) toast.warning(`The export stopped at ${rows.length} rows. Narrow the filters to export the rest.`);
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
      <PopoverContent align="start" collisionPadding={16} className="w-72 p-2">
        <ul className="space-y-1">
          {datasets.map((ds) => (
            <li key={ds.filename} className="rounded-lg p-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-zinc-900">{ds.label}</span>
                <span className="text-xs text-zinc-500 tabular-nums">{ds.hint ?? `${ds.rows?.length ?? 0} rows`}</span>
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
