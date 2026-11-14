'use client';

import { useState, type ReactNode } from 'react';
import { ListFilter } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The single row above the task table: search, quick filters and actions on one line, with the full filter set
 * behind a "Filters" button. The button shows how many filters are on, so a collapsed panel never hides them.
 */
export function TaskToolbar({
  row,
  trailing,
  activeCount,
  children,
}: {
  row: ReactNode;
  trailing?: ReactNode;
  activeCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="tff-card space-y-2 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {row}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors',
            open || activeCount > 0
              ? 'border-transparent bg-[#E6F6F3] font-medium text-[#0B6B62]'
              : 'border-dashed border-[#DCDFE5] text-slate-600 hover:border-slate-400',
          )}
        >
          <ListFilter className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && <span className="rounded-full bg-white/80 px-1.5 text-xs tabular-nums">{activeCount}</span>}
        </button>
        {trailing && <div className="ml-auto">{trailing}</div>}
      </div>
      {open && <div className="space-y-2 border-t border-[#E8EAEE] pt-2">{children}</div>}
    </div>
  );
}
