'use client';
import { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { useDebouncedCallback } from '@/lib/hooks/use-debounced-callback';

/**
 * Search box for the tasks page. It lives on the page, not inside the results table,
 * so it stays on screen (and keeps focus) when a search finds nothing.
 */
export function TaskSearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const search = searchParams.get('q') ?? '';

  const onSearch = useDebouncedCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    const v = e.target.value.trim();
    if (v) params.set('q', v);
    else params.delete('q');
    params.delete('page');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }, 300);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
      <input
        type="text"
        placeholder="Search tasks…"
        aria-label="Search tasks"
        defaultValue={search}
        onChange={onSearch}
        className="pl-9 pr-3 h-9 rounded-md border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 w-60"
      />
    </div>
  );
}
