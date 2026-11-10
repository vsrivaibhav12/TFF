'use client';

import { ReportExport } from '@/components/reports/report-export';
import { exportTasksAction, exportClientsAction, exportAuditAction, exportWorkDoneAction } from '@/lib/actions/exports';
import type { TaskFilterParams } from '@/lib/tasks/filter-params';

type Source =
  | { kind: 'tasks'; filters: TaskFilterParams }
  | { kind: 'clients'; filters: { group?: string; city?: string; q?: string } }
  | { kind: 'audit'; filters: { actor?: string; action?: string; entity?: string; from?: string; to?: string } }
  | { kind: 'work-done'; filters: { from?: string; to?: string; q?: string; client?: string; task?: string; user?: string } };

/**
 * Export button for a paged list. It exports every row that matches the page's filters, not
 * only the rows on screen: the rows are fetched on the server when the user clicks.
 */
export function FullExport({
  source,
  label,
  filename,
  total,
}: {
  source: Source;
  /** For example "tasks" gives "All 1,078 matching tasks". */
  label: string;
  filename: string;
  total?: number;
}) {
  const stamp = new Date().toISOString().slice(0, 10);

  async function load() {
    const r =
      source.kind === 'tasks' ? await exportTasksAction(source.filters)
      : source.kind === 'clients' ? await exportClientsAction(source.filters)
      : source.kind === 'audit' ? await exportAuditAction(source.filters)
      : await exportWorkDoneAction(source.filters);
    return r.success ? { rows: r.data.rows, truncated: r.data.truncated } : { error: r.error };
  }

  return (
    <ReportExport
      datasets={[
        {
          label: `All matching ${label}`,
          filename: `${filename}_${stamp}`,
          sheetName: label.charAt(0).toUpperCase() + label.slice(1),
          hint: total !== undefined ? `${total.toLocaleString('en-IN')} rows` : 'Every row in this view',
          load,
        },
      ]}
    />
  );
}
