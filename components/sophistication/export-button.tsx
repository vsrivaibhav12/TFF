'use client';

import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';

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
        setLoading(false);
        return;
      }

      if (format === 'csv') {
        const csv = convertToCsv(rows);
        downloadBlob(csv, `${filename}.csv`, 'text/csv');
      } else {
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${filename}.xlsx`);
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

function convertToCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: any) => {
    const s = val === null || val === undefined ? '' : String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
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
