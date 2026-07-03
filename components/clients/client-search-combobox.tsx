'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebouncedSearch } from '@/lib/hooks/use-debounced-search';
import { searchClients } from '@/lib/actions/clients';

export interface ClientOption {
  id: string;
  business_name: string;
  pan?: string | null;
}

interface ClientSearchComboboxProps {
  value: string;
  onChange: (value: string) => void;
  /** Pre-loaded clients for synchronous (client-side) search mode. */
  clients?: ClientOption[];
  /** When true, clients are fetched server-side as the user types. */
  async?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export function clientOptionLabel(c: ClientOption): string {
  return c.pan ? `${c.business_name} (${c.pan})` : c.business_name;
}

export function ClientSearchCombobox({
  value,
  onChange,
  clients: initialClients = [],
  async: asyncMode = false,
  placeholder = 'Select client...',
  searchPlaceholder = 'Search clients...',
  className,
  disabled = false,
}: ClientSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const { query, setQuery, debouncedQuery, clear } = useDebouncedSearch(300);
  const [asyncClients, setAsyncClients] = React.useState<ClientOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Async search: fetch results when the debounced query changes.
  React.useEffect(() => {
    if (!asyncMode) return;
    let active = true;
    setLoading(true);
    searchClients({ q: debouncedQuery, limit: 25 })
      .then((r) => {
        if (!active) return;
        setAsyncClients(r.success ? r.data : []);
      })
      .catch(() => setAsyncClients([]))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [asyncMode, debouncedQuery]);

  const filteredSyncClients = React.useMemo(() => {
    if (asyncMode) return [];
    if (!query.trim()) return initialClients;
    const q = query.toLowerCase();
    return initialClients.filter(
      (c) =>
        c.business_name.toLowerCase().includes(q) ||
        (c.pan ?? '').toLowerCase().includes(q)
    );
  }, [asyncMode, initialClients, query]);

  const options = asyncMode ? asyncClients : filteredSyncClients;

  // Keep the currently selected client visible in the trigger even if it isn't
  // in the latest async result set.
  const selectedOption = React.useMemo(() => {
    return options.find((c) => c.id === value) ?? initialClients.find((c) => c.id === value);
  }, [options, initialClients, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal hover:bg-zinc-50',
            !selectedOption && 'text-zinc-500',
            className
          )}
        >
          <span className="truncate">{selectedOption ? clientOptionLabel(selectedOption) : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b border-zinc-100 px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin text-zinc-400" />}
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {options.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">
              {loading ? 'Searching...' : 'No clients found.'}
            </div>
          ) : (
            options.map((c) => (
              <div
                key={c.id}
                role="option"
                aria-selected={value === c.id}
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                  clear();
                }}
                className={cn(
                  'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-zinc-100 hover:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  value === c.id ? 'bg-zinc-100 text-zinc-900 font-medium' : ''
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  {value === c.id && <Check className="h-4 w-4" />}
                </span>
                <span className="truncate">{clientOptionLabel(c)}</span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
