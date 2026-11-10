'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RANGE_PRESETS } from '@/lib/reports/date-range';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

const ALL = '__all__';

export interface FilterSelect {
  /** URL parameter name, for example "member". */
  key: string;
  label: string;
  /** Text for the "no filter" choice, for example "All members". */
  allLabel: string;
  options: { value: string; label: string }[];
}

/**
 * Filter bar for reports: quick date presets, a custom range, and any number of select
 * filters. Everything lives in the URL, so a filtered report can be bookmarked and shared.
 */
export function ReportFilters({
  from,
  to,
  preset,
  selects = [],
  search,
}: {
  from: string;
  to: string;
  preset: string;
  selects?: FilterSelect[];
  /** Adds a free-text search box bound to this URL parameter. */
  search?: { key: string; placeholder: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [text, setText] = useState(search ? sp.get(search.key) ?? '' : '');

  function push(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(sp.toString());
    mutate(next);
    next.delete('page');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const filtered = selects.some((s) => sp.get(s.key)) || !!(search && sp.get(search.key)) || sp.has('from') || sp.has('range');

  return (
    <div className="tff-card p-4 space-y-4" role="search" aria-label="Report filters">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date range">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={preset === p.key}
            onClick={() => push((q) => { q.set('range', p.key); q.delete('from'); q.delete('to'); })}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              preset === p.key
                ? 'border-teal-600 bg-teal-50 text-teal-700'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="rf-from" className="text-xs font-medium text-zinc-500">From</label>
          <Input id="rf-from" type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 w-44" />
        </div>
        <div className="space-y-1">
          <label htmlFor="rf-to" className="text-xs font-medium text-zinc-500">To</label>
          <Input id="rf-to" type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} className="h-9 w-44" />
        </div>
        <Button
          size="sm"
          variant={preset === 'custom' ? 'default' : 'outline'}
          disabled={!customFrom || !customTo}
          onClick={() => push((q) => { q.set('from', customFrom); q.set('to', customTo); q.delete('range'); })}
        >
          Apply range
        </Button>

        {selects.map((s) => (
          <div key={s.key} className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">{s.label}</label>
            <Select
              value={sp.get(s.key) ?? ALL}
              onValueChange={(v) => push((q) => { if (v === ALL) q.delete(s.key); else q.set(s.key, v); })}
            >
              <SelectTrigger className="h-9 w-48" aria-label={s.label}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{s.allLabel}</SelectItem>
                {s.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

        {search && (
          <form
            className="space-y-1"
            onSubmit={(e) => { e.preventDefault(); push((q) => { if (text.trim()) q.set(search.key, text.trim()); else q.delete(search.key); }); }}
          >
            <label htmlFor="rf-search" className="text-xs font-medium text-zinc-500">Search</label>
            <Input id="rf-search" value={text} onChange={(e) => setText(e.target.value)} placeholder={search.placeholder} className="h-9 w-56" />
          </form>
        )}

        {filtered && (
          <Button size="sm" variant="ghost" className="text-zinc-500" onClick={() => router.push(pathname)}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
        )}
      </div>
    </div>
  );
}
