'use server';

import { requireRole } from '@/lib/auth/require-role';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { csvEscapeCell } from '@/lib/csv-utils';
import { z } from 'zod';

const ExportInputSchema = z.object({
  rows: z.array(z.record(z.any())),
  headers: z.array(z.string()).optional(),
});

/**
 * Generic server-side CSV export.
 * Returns the CSV string to the client for download.
 */
export async function exportTableDataAction(
  rows: Record<string, any>[],
  headers?: string[]
): Promise<ActionResult<{ csv: string; count: number }>> {
  try {
    await requireRole(['admin', 'team']);

    const parsed = ExportInputSchema.safeParse({ rows, headers });
    if (!parsed.success) return fail('Invalid export data', 'VALIDATION');

    const validRows = parsed.data.rows;
    if (!validRows.length) return fail('No data to export', 'EMPTY_DATASET');

    const cols = parsed.data.headers ?? Object.keys(validRows[0]);
    const lines = [
      cols.join(','),
      ...validRows.map((row) => cols.map((c) => csvEscapeCell(row[c])).join(',')),
    ];

    return ok({ csv: lines.join('\n'), count: validRows.length });
  } catch (e: any) {
    return fail(e.message || 'Export failed', 'EXPORT_ERROR');
  }
}

/**
 * Generic server-side Excel export.
 * Returns a base64-encoded XLSX workbook so the client can trigger a download
 * without bundling the xlsx library in the browser.
 */
export async function exportTableDataToExcelAction(
  rows: Record<string, any>[],
  sheetName = 'Sheet1'
): Promise<ActionResult<{ base64: string; count: number }>> {
  try {
    await requireRole(['admin', 'team']);

    const parsed = ExportInputSchema.safeParse({ rows });
    if (!parsed.success) return fail('Invalid export data', 'VALIDATION');

    const validRows = parsed.data.rows;
    if (!validRows.length) return fail('No data to export', 'EMPTY_DATASET');

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(validRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64 = Buffer.from(buf).toString('base64');

    return ok({ base64, count: validRows.length });
  } catch (e: any) {
    return fail(e.message || 'Export failed', 'EXPORT_ERROR');
  }
}
