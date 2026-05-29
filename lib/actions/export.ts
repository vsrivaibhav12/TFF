'use server';

import { requireUser } from '@/lib/auth/require-role';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

/**
 * Generic server-side CSV export.
 * Returns the CSV string to the client for download.
 */
export async function exportTableDataAction(
  rows: Record<string, any>[],
  headers?: string[]
): Promise<ActionResult<{ csv: string; count: number }>> {
  try {
    await requireUser();
    if (!rows.length) return fail('No data to export', 'EMPTY_DATASET');

    const cols = headers ?? Object.keys(rows[0]);
    const escape = (val: any) => {
      const s = val === null || val === undefined ? '' : String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [
      cols.join(','),
      ...rows.map((row) => cols.map((c) => escape(row[c])).join(',')),
    ];

    return ok({ csv: lines.join('\n'), count: rows.length });
  } catch (e: any) {
    return fail(e.message || 'Export failed', 'EXPORT_ERROR');
  }
}
