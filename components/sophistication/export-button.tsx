'use client';

import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';
import { convertToCsv } from '@/lib/csv-utils';
import { exportTableDataToExcelAction } from '@/lib/actions/export';
import { toast } from 'sonner';

interface ExportButtonProps {
  data?: Record<string, any>[];
  filename: string;
  sheetName?: string;
  format?: 'excel' | 'csv';
  onExport?: () => Promise<Record<string, any>[]>;
  disabled?: boolean;
}

export default function ExportButton({
  data,
  filename,
  sheetName = 'Sheet1',
  format = 'excel',
  onExport,
  disabled = false,
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      let rows = data;
      if (onExport) {
        rows = await onExport();
      }
      if (!rows || rows.length === 0) {
        return;
      }

      if (format === 'csv') {
        const csv = convertToCsv(rows);
        downloadBlob(csv, `${filename}.csv`, 'text/csv');
      } else {
        const r = await exportTableDataToExcelAction(rows, sheetName);
        if (!r.success) {
          toast.error(r.error || 'Excel export failed');
          return;
        }
        const bytes = Buffer.from(r.data.base64, 'base64');
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setLoading(false);
    }
  }

  const Icon = format === 'csv' ? FileText : FileSpreadsheet;

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={disabled || loading}>
      <Icon className="h-4 w-4 mr-1" />
      {loading ? 'Exporting…' : 'Export'}
    </Button>
  );
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
