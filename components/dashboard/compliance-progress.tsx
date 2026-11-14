import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { periodLabel, shiftMonth, type ProgressRow, type ProgressView } from '@/lib/services/compliance-progress';

function tier(pct: number) {
  return pct >= 90 ? 'tff-pill-good' : pct >= 75 ? 'tff-pill-warn' : 'tff-pill-bad';
}

function short(name: string) {
  const m = name.match(/[A-Z0-9]+/g);
  return (m ? m.join('') : name).slice(0, 3).toUpperCase();
}

/** Completion of each filing for a month or fiscal quarter, as figures and a tiered percentage chip. */
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
  const navBtn = 'h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[#E8EAEE] bg-white text-slate-600 hover:bg-slate-50';

  return (
    <section className="tff-card" data-testid="compliance-progress">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[#E8EAEE]">
        <div>
          <h3 className="tff-section-title">Compliance progress</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Filings due in {periodLabel(view, monthKey)}
            {totalAll > 0 ? ` · ${doneAll} of ${totalAll} done` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-[10px] border border-[#E8EAEE] bg-slate-50 p-0.5 text-[13px]">
            {(['month', 'quarter'] as const).map((v) => (
              <Link
                key={v}
                href={href(v, monthKey)}
                scroll={false}
                aria-current={view === v ? 'true' : undefined}
                className={cn('rounded-lg px-2.5 py-1', view === v ? 'bg-white font-medium text-slate-900 shadow-card' : 'text-slate-600 hover:text-slate-900')}
              >
                {v === 'month' ? 'Month' : 'Quarter'}
              </Link>
            ))}
          </div>
          <Link href={href(view, shiftMonth(monthKey, -step))} scroll={false} aria-label="Previous period" className={navBtn}><ChevronLeft className="h-4 w-4" /></Link>
          <Link href={href(view, currentMonthKey)} scroll={false} className="h-8 inline-flex items-center rounded-lg border border-[#E8EAEE] bg-white px-2.5 text-[13px] text-slate-600 hover:bg-slate-50">Today</Link>
          <Link href={href(view, shiftMonth(monthKey, step))} scroll={false} aria-label="Next period" className={navBtn}><ChevronRight className="h-4 w-4" /></Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500">No compliance tasks fall due in this period.</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.rule_code} className="flex items-center gap-3 px-5 py-3 border-b border-[#E8EAEE] last:border-0 hover:bg-slate-50/70">
              <span className="h-[34px] w-[34px] shrink-0 rounded-[10px] bg-[#E6F6F3] text-[#0B6B62] text-xs font-semibold flex items-center justify-center">{short(r.rule_name)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900">{r.rule_name}</div>
                <div className="text-xs text-slate-500 tabular-nums">{r.completed} of {r.total} done</div>
              </div>
              {r.inProgress > 0 && <span className="tff-pill tff-pill-mute hidden sm:inline-flex">{r.inProgress} in progress</span>}
              {r.overdue > 0 && <span className="tff-pill tff-pill-bad">{r.overdue} overdue</span>}
              <span className={cn('tff-pill min-w-[3.5rem] justify-center', tier(r.pct))}>{r.pct}%</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[#E8EAEE] text-xs">
        <span className="flex items-center gap-3 text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-600" /> 90% and above</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-600" /> 75 to 89%</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-600" /> Below 75%</span>
        </span>
        <Link href={complianceHref} className="font-medium text-teal-700 hover:underline">Open compliance</Link>
      </div>
    </section>
  );
}
