import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { PageHeader } from '@/components/ui/page-header';
import EmptyState from '@/components/sophistication/empty-state';
import ExportButton from '@/components/sophistication/export-button';
import { DockLink } from '@/components/shell/dock-link';
import { formatPeriodColumns } from '@/lib/periods';
import { reviewTaskPeriod } from '@/lib/services/period-review';
import { listTasksForPeriodReview } from '@/lib/repositories/period-review';

export const dynamic = 'force-dynamic';

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export default async function PeriodReviewPage() {
  const me = await requireRole('admin');
  await requireCapabilityOrRedirect(me, 'services.manage');

  const rows = await listTasksForPeriodReview();
  const flagged = rows
    .map((r) => {
      const sub = one(r.sub_services);
      const review = sub ? reviewTaskPeriod(r, sub) : { status: 'ok' as const };
      return { r, sub, client: one(r.clients), review };
    })
    .filter((x) => x.review.status !== 'ok');
  const mismatches = flagged.filter((x) => x.review.status === 'mismatch');
  const confirms = flagged.filter((x) => x.review.status === 'confirm');

  const exportRows = flagged.map((x) => ({
    Task: x.r.task_number ?? x.r.id,
    Client: x.client?.business_name ?? '',
    Service: x.sub?.name ?? '',
    Status: x.r.status,
    'Stored period': formatPeriodColumns(x.r) || 'None',
    Issue: x.review.reason ?? '',
    'Suggested period': x.review.suggestedKey ?? '',
  }));

  const table = (items: typeof flagged, title: string, hint: string) => (
    <section className="space-y-2">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">{title} <span className="text-zinc-500 font-normal tabular-nums">({items.length})</span></h2>
        <p className="text-sm text-zinc-500">{hint}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">None.</p>
      ) : (
        <div className="tff-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-100">
                <th className="px-3 py-2 font-medium">Task</th>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Service</th>
                <th className="px-3 py-2 font-medium">Stored period</th>
                <th className="px-3 py-2 font-medium">Issue</th>
                <th className="px-3 py-2 font-medium">Suggested</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((x) => (
                <tr key={x.r.id}>
                  <td className="px-3 py-2 font-mono text-xs">{x.r.task_number ?? '—'}</td>
                  <td className="px-3 py-2">{x.client?.business_name ?? '—'}</td>
                  <td className="px-3 py-2">{x.sub?.name ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{formatPeriodColumns(x.r) || 'None'}</td>
                  <td className="px-3 py-2 text-zinc-600">{x.review.reason}</td>
                  <td className="px-3 py-2 tabular-nums">{x.review.suggestedKey ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <DockLink item={{ type: 'task', id: x.r.id, mode: 'edit' }} href={`/admin/tasks/${x.r.id}`} className="text-teal-700 hover:underline text-xs font-medium">
                      Edit period
                    </DockLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <Link href="/admin/settings" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Settings
      </Link>
      <PageHeader
        title="Period review"
        subtitle="Tasks whose stored period does not fit what their service expects. Nothing is changed automatically."
        actions={<ExportButton data={exportRows} filename="period-review" sheetName="Period review" format="csv" disabled={exportRows.length === 0} />}
      />
      {flagged.length === 0 ? (
        <EmptyState title="Every period fits its service" body="No task needs a correction." variant="generic" />
      ) : (
        <>
          {table(mismatches, 'Does not fit', 'The period is missing, of the wrong kind, or present on a service that has none. Open the task and choose the right period.')}
          {table(confirms, 'Needs confirmation', 'Quarterly and yearly tasks saved before financial-year periods. The suggested period assumes the stored year is the financial-year start; confirm or correct it.')}
        </>
      )}
    </div>
  );
}
