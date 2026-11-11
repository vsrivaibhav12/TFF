import Link from 'next/link';
import { cn } from '@/lib/utils';
import { statusSplitWidths, type Tile } from '@/lib/tasks/tiles';

export type TileView = { tile: Tile; count: number; href: string; active: boolean };

/**
 * A row of clickable counts that filter the list below, and a thin bar showing how the tasks in
 * the current view split between pending, in progress and completed.
 */
export function TaskSummaryTiles({
  tiles,
  split,
}: {
  tiles: TileView[];
  split: { pending: number; in_progress: number; completed: number };
}) {
  const widths = statusSplitWidths(split);
  const total = split.pending + split.in_progress + split.completed;

  return (
    <div className="space-y-2" data-testid="task-summary-tiles">
      <nav aria-label="Task summary" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {tiles.map(({ tile, count, href, active }) => (
          <Link
            key={tile.key}
            href={href}
            aria-current={active ? 'true' : undefined}
            data-testid={`task-tile-${tile.key}`}
            className={cn(
              'rounded-lg border px-3 py-2 transition-colors',
              active ? 'border-teal-600 bg-white' : 'border-transparent bg-zinc-50 hover:border-zinc-300',
            )}
          >
            <div
              className={cn(
                'text-xl font-medium tabular-nums leading-tight',
                count > 0 && tile.tone === 'danger' ? 'text-red-600' : count > 0 && tile.tone === 'warning' ? 'text-amber-600' : 'text-zinc-900',
              )}
            >
              {count.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-zinc-500">{tile.label}</div>
          </Link>
        ))}
      </nav>

      {total > 0 && (
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden flex gap-0.5"
            role="img"
            aria-label={`${split.pending} pending, ${split.in_progress} in progress, ${split.completed} completed`}
          >
            <div className="bg-zinc-400" style={{ width: `${widths.pending}%` }} />
            <div className="bg-teal-600" style={{ width: `${widths.in_progress}%` }} />
            <div className="bg-blue-600" style={{ width: `${widths.completed}%` }} />
          </div>
          <span className="text-xs text-zinc-500 tabular-nums whitespace-nowrap">
            {split.pending.toLocaleString('en-IN')} pending · {split.in_progress.toLocaleString('en-IN')} in progress · {split.completed.toLocaleString('en-IN')} completed
          </span>
        </div>
      )}
    </div>
  );
}
