'use client';

import * as React from 'react';
import { cn, onEnterSpace } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, X } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  searchString?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const filtered = React.useMemo(() => {
    if (!search) return options;
    const s = search.toLowerCase();
    return options.filter((o) => (o.searchString ?? o.label).toLowerCase().includes(s));
  }, [options, search]);

  function toggle(v: string) {
    const next = new Set(selectedSet);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(Array.from(next));
  }

  function remove(v: string) {
    const next = new Set(selectedSet);
    next.delete(v);
    onChange(Array.from(next));
  }

  const selectedLabels = options.filter((o) => selectedSet.has(o.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal hover:bg-zinc-50 h-auto min-h-9 py-1 px-2', className)}
        >
          <div className="flex flex-wrap gap-1">
            {selectedLabels.length === 0 && <span className="text-zinc-500">{placeholder}</span>}
            {selectedLabels.map((o) => (
              <Badge key={o.value} variant="default" className="font-normal text-xs gap-1 pr-1">
                {o.label}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); remove(o.value); }}
                  onKeyDown={onEnterSpace(() => remove(o.value))}
                  className="cursor-pointer hover:text-red-600"
                  aria-label={`Remove ${o.label}`}
                >
                  <X className="h-3 w-3" />
                </span>
              </Badge>
            ))}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b border-zinc-100 px-3">
          <Input
            className="h-10 border-0 bg-transparent px-0 text-sm outline-none placeholder:text-zinc-500"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">No results found.</div>
          ) : (
            filtered.map((o) => {
              const checked = selectedSet.has(o.value);
              return (
                <div
                  key={o.value}
                  role="option"
                  tabIndex={0}
                  aria-selected={checked}
                  onClick={() => toggle(o.value)}
                  onKeyDown={onEnterSpace(() => toggle(o.value))}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer',
                    checked ? 'bg-teal-50 text-teal-900' : 'hover:bg-zinc-50'
                  )}
                >
                  <div className={cn('flex h-4 w-4 items-center justify-center rounded border', checked ? 'bg-teal-600 border-teal-600' : 'border-zinc-300')}>
                    {checked && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="truncate">{o.label}</span>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
