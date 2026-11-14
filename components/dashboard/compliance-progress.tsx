import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { periodLabel, shiftMonth, type ProgressRow, type ProgressView } from '@/lib/services/compliance-progress';

const BAR = 'h-2 rounded-full bg-zinc-100 overflow-hidden flex';

/** Completion of each filing for the filings due in a month or fiscal quarter. Navigation is by link, so it needs no client code. */
export function ComplianceProgress({
  rows,
  view,
  monthKey,
  currentMonthKey,
  basePath,
  complianceHref,
}: {
  rows: ProgressRow[];
  view: ProgressView;
  monthKey: string;
  currentMonthKey: string;
  basePath: string;
  complianceHref: string;
}) {
  const href = (v: ProgressView, m: string) => `${basePath}?cview=${v}&cmonth=${m}`;
  const step = view === 'quarter' ? 3 : 1;
  const totalAll = rows.reduce((n, r) => n + r.total, 0);
  const doneAll = rows.reduce((n, r) => n + r.completed, 0);
  const overallPct = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;

  return (
    <section className="tff-card p-4 space-y-4" data-testid="compliance-progress">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="tff-section-title">Compliance progress</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Filings due in {periodLabel(view, monthKey)}
            {totalAll > 0 ? ` · ${doneAll} of ${totalAll} done (${overallPct}%)` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 text-xs">
            {(['month', 'quarter'] as const).map((v) => (
              <Link
                key={v}
                href={href(v, monthKey)}
                scroll={false}
                aria-current={view === v ? 'true' : undefined}
                className={cn('px-2.5 py-1 rounded-md', view === v ? 'bg-teal-600 text-white' : 'text-zinc-600 hover:bg-zinc-50')}
              >
                {v === 'month' ? 'Month' : 'Quarter'}
              </Link>
            ))}
          </div>
          <div className="inline-flex items-center gap-1">
            <Link href={href(view, shiftMonth(monthKey, -step))} scroll={false} aria-label="Previous period" className="p-1.5 rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
            <Link href={href(view, currentMonthKey)} scroll={false} className="px-2 py-1 text-xs rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
              Today
            </Link>
            <Link href={href(view, shiftMonth(monthKey, step))} scroll={false} aria-label="Next period" className="p-1.5 rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No filings fall due in this period.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const w = (n: number) => `${(n / r.total) * 100}%`;
            return (
              <li key={r.rule_code}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-zinc-900 truncate">{r.rule_name}</span>
                  <span className="text-xs text-zinc-500 tabular-nums whitespace-nowrap">
                    <span className="font-semibold text-zinc-900">{r.pct}%</span> · {r.completed} of {r.total} done
                    {r.overdue > 0 ? <span className="text-red-600"> · {r.overdue} overdue</span> : null}
                  </span>
                </div>
                <div
                  className={cn(BAR, 'mt-1')}
                  role="img"
                  aria-label={`${r.completed} done, ${r.inProgress} in progress, ${r.notStarted} not started, ${r.overdue} overdue, out of ${r.total}`}
                >
                  <div className="bg-teal-600" style={{ width: w(r.completed) }} />
                  <div className="bg-teal-300" style={{ width: w(r.inProgress) }} />
                  <div className="bg-red-600" style={{ width: w(r.overdue) }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-600" /> Done</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-300" /> In progress</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-600" /> Overdue</span>
        </span>
        <Link href={complianceHref} className="text-teal-700 hover:underline font-medium">Open compliance</Link>
      </div>
    </section>
  );
}
