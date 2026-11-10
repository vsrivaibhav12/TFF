'use client';

import { useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DEFAULT_TASK_STATUSES, TASK_STATUS_OPTIONS, sameSet } from '@/lib/tasks/filter-params';

/**
 * Multi-select for task status. Any combination can be chosen (pending, in progress,
 * completed, cancelled, plus the awaiting-client and stuck flags). The list always has at
 * least one choice: unticking the last one would mean "nothing", so it is not allowed.
 * The default is pending and in progress, which is how the task list opens.
 */
export function TaskStatusFilter({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const isDefault = sameSet(value, DEFAULT_TASK_STATUSES);

  const labelOf = (v: string) => TASK_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
  const summary =
    value.length === 0
      ? 'Status'
      : value.length <= 2
        ? value.map(labelOf).join(', ')
        : `${value.length} statuses`;

  function toggle(v: string) {
    const has = value.includes(v);
    if (has && value.length === 1) return; // keep at least one
    onChange(has ? value.filter((x) => x !== v) : [...value, v]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Status filter: ${summary}`}
          data-testid="task-status-filter"
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors',
            isDefault
              ? 'border-dashed border-zinc-300 bg-zinc-50 text-zinc-600 hover:border-zinc-400'
              : 'border-teal-300 bg-teal-50 text-teal-800 hover:border-teal-400',
          )}
        >
          <span className="max-w-[12rem] truncate">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <p className="px-2 pb-1 pt-1 text-xs font-medium text-zinc-500">Show tasks that are</p>
        <ul>
          {TASK_STATUS_OPTIONS.map((o, i) => {
            const checked = value.includes(o.value);
            const id = `status-opt-${o.value}`;
            return (
              <li key={o.value}>
                {i === 4 && <div className="my-1 border-t border-zinc-100" role="separator" />}
                <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                  <Checkbox id={id} checked={checked} onCheckedChange={() => toggle(o.value)} />
                  {o.label}
                </label>
              </li>
            );
          })}
        </ul>
        <div className="mt-1 flex items-center justify-between border-t border-zinc-100 px-2 pt-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-40"
            disabled={isDefault}
            onClick={() => onChange([...DEFAULT_TASK_STATUSES])}
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
          <button
            type="button"
            className="text-xs font-medium text-teal-700 hover:underline"
            onClick={() => onChange(['pending', 'in_progress', 'completed', 'cancelled'])}
          >
            Select all
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
