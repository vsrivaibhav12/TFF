import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Horizontal bar list: one labelled bar per row, scaled to the largest value. */
export function BarList({
  items,
  format,
  emptyText = 'Nothing to show for this range.',
  barClass = 'bg-teal-500',
}: {
  items: { key: string; name: string; value: number; hint?: string }[];
  format: (n: number) => string;
  emptyText?: string;
  barClass?: string;
}) {
  if (items.length === 0) return <div className="p-8 text-sm text-slate-500 text-center">{emptyText}</div>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((i) => (
        <li key={i.key} className="px-5 py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-slate-900 truncate">{i.name}</span>
            <span className="text-sm tabular-nums text-slate-700 shrink-0">
              {format(i.value)}
              {i.hint && <span className="ml-2 text-xs text-slate-500">{i.hint}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden" role="img" aria-label={`${i.name}: ${format(i.value)}`}>
            <div className={cn('h-full rounded-full', barClass)} style={{ width: `${Math.max(2, Math.round((i.value / max) * 100))}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Column chart over days. Shows a tooltip with the exact value on hover or focus. */
export function DayColumns({ days, format }: { days: { date: string; value: number }[]; format: (n: number) => string }) {
  if (days.length === 0) return null;
  const max = Math.max(1, ...days.map((d) => d.value));
  return (
    <div className="px-5 pb-4 pt-2">
      <div className={`flex h-28 items-end ${days.length > 45 ? 'gap-px' : 'gap-1'}`} role="img" aria-label="Daily totals">
        {days.map((d) => (
          <div key={d.date} className="group relative flex-1 min-w-[2px] h-full flex items-end" title={`${d.date}: ${format(d.value)}`}>
            <div className="w-full rounded-t-sm bg-teal-500/80 group-hover:bg-teal-600 transition-colors" style={{ height: `${Math.max(d.value > 0 ? 4 : 0, Math.round((d.value / max) * 100))}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500 tabular-nums">
        <span>{days[0].date}</span>
        <span>{days[days.length - 1].date}</span>
      </div>
    </div>
  );
}

/** Previous / next links for server-paged tables. */
export function Pager({ page, pages, total, pageSize, hrefFor }: { page: number; pages: number; total: number; pageSize: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border';
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
      <p className="text-sm text-slate-500 tabular-nums">Showing {from}–{to} of {total}</p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} aria-label="Previous page" className={cn(btn, 'border-slate-200 text-slate-600 hover:bg-slate-50')}><ChevronLeft className="h-4 w-4" /></Link>
        ) : (
          <span aria-disabled="true" className={cn(btn, 'border-slate-100 text-slate-300')}><ChevronLeft className="h-4 w-4" /></span>
        )}
        <span className="px-3 text-sm font-medium text-slate-700 tabular-nums">Page {page} of {pages}</span>
        {page < pages ? (
          <Link href={hrefFor(page + 1)} aria-label="Next page" className={cn(btn, 'border-slate-200 text-slate-600 hover:bg-slate-50')}><ChevronRight className="h-4 w-4" /></Link>
        ) : (
          <span aria-disabled="true" className={cn(btn, 'border-slate-100 text-slate-300')}><ChevronRight className="h-4 w-4" /></span>
        )}
      </div>
    </div>
  );
}
