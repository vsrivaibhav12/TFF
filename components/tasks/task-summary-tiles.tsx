import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Tile } from '@/lib/tasks/tiles';

export type TileView = { tile: Tile; count: number; href: string; active: boolean };

/**
 * Saved views as tabs with a count. Each one is a link that sets the same URL filters the filter bar
 * uses, so the list, the counts and the export always agree. Clicking the active tab clears it.
 */
export function TaskSummaryTiles({ tiles }: { tiles: TileView[] }) {
  return (
    <nav aria-label="Task views" data-testid="task-summary-tiles" className="flex gap-1 overflow-x-auto border-b border-[#E8EAEE]">
      {tiles.map(({ tile, count, href, active }) => (
        <Link
          key={tile.key}
          href={href}
          aria-current={active ? 'true' : undefined}
          data-testid={`task-tile-${tile.key}`}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors',
            active ? 'border-teal-600 font-medium text-slate-900' : 'border-transparent text-slate-600 hover:text-slate-900',
          )}
        >
          {tile.label}
          <span
            className={cn(
              'rounded-full border px-2 text-xs tabular-nums',
              count > 0 && tile.tone === 'danger'
                ? 'border-red-100 bg-red-50 text-red-600'
                : count > 0 && tile.tone === 'warning'
                  ? 'border-amber-100 bg-amber-50 text-amber-700'
                  : 'border-[#E8EAEE] bg-slate-50 text-slate-500',
            )}
          >
            {count.toLocaleString('en-IN')}
          </span>
        </Link>
      ))}
    </nav>
  );
}
