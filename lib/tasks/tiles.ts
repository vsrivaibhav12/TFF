// Pure: the summary tiles on the tasks page. Each tile is a one-click filter expressed in the same
// URL parameters the filter bar uses, so the list, the counts and the export always agree.
import { parseTaskFilterParams, type TaskFilterParams } from '@/lib/tasks/filter-params';
import type { TaskFilterOpts } from '@/lib/repositories/tasks';

export type TileKey = 'open' | 'overdue' | 'today' | 'week' | 'waiting' | 'verify' | 'unassigned';

export type Tile = {
  key: TileKey;
  label: string;
  /** URL parameters this tile sets. */
  set: Record<string, string>;
  /** URL parameters this tile replaces (the old scope) before setting its own. */
  reset: string[];
  tone?: 'danger' | 'warning';
};

type Params = Record<string, string | undefined>;

const SCOPE = ['status', 'due_from', 'due_to', 'verification'];

export function taskTiles(args: { todayIso: string; weekEndIso: string; yesterdayIso: string; isAdmin: boolean }): Tile[] {
  const tiles: Tile[] = [
    { key: 'open', label: 'Open', set: {}, reset: SCOPE },
    { key: 'overdue', label: 'Overdue', set: { due_to: args.yesterdayIso }, reset: SCOPE, tone: 'danger' },
    { key: 'today', label: 'Due today', set: { due_from: args.todayIso, due_to: args.todayIso }, reset: SCOPE },
    { key: 'week', label: 'Due this week', set: { due_from: args.todayIso, due_to: args.weekEndIso }, reset: SCOPE },
    { key: 'waiting', label: 'Waiting on client', set: { status: 'blocked' }, reset: SCOPE, tone: 'warning' },
    { key: 'verify', label: 'To verify', set: { status: 'completed', verification: 'pending' }, reset: SCOPE },
  ];
  if (args.isAdmin) tiles.push({ key: 'unassigned', label: 'Unassigned', set: { assigned: 'unassigned' }, reset: [...SCOPE, 'assigned'] });
  return tiles;
}

const present = (v: string | undefined) => v !== undefined && v !== '';

/** The filter a tile's count uses: the filters already applied, with this tile's scope in place of the old one. */
export function tileFilterOpts(tile: Tile, current: Params): TaskFilterOpts {
  const next: Params = { ...current };
  for (const k of tile.reset) delete next[k];
  Object.assign(next, tile.set);
  return parseTaskFilterParams(next as TaskFilterParams);
}

export function tileIsActive(tile: Tile, current: Params): boolean {
  const entries = Object.entries(tile.set);
  if (!entries.every(([k, v]) => current[k] === v)) return false;
  // Scope parameters the tile does not set must be absent, or another view is showing.
  return SCOPE.filter((k) => !(k in tile.set)).every((k) => !present(current[k]));
}

/** Where clicking the tile goes. Clicking the active tile again removes it. */
export function tileHref(tile: Tile, current: Params, basePath: string): string {
  const next: Params = { ...current };
  delete next.page;
  if (tileIsActive(tile, current)) {
    for (const k of Object.keys(tile.set)) delete next[k];
  } else {
    for (const k of tile.reset) delete next[k];
    Object.assign(next, tile.set);
  }
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (present(v)) qs.set(k, v as string);
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/** Whole-number percentages of the three open statuses that add up to exactly 100 (largest remainder). */
export function statusSplitWidths(counts: { pending: number; in_progress: number; completed: number }): { pending: number; in_progress: number; completed: number } {
  const keys = ['pending', 'in_progress', 'completed'] as const;
  const total = keys.reduce((n, k) => n + counts[k], 0);
  if (total === 0) return { pending: 0, in_progress: 0, completed: 0 };
  const raw = keys.map((k) => ({ k, exact: (counts[k] / total) * 100 }));
  const floors = raw.map((r) => ({ ...r, w: Math.floor(r.exact) }));
  let left = 100 - floors.reduce((n, r) => n + r.w, 0);
  for (const r of [...floors].sort((a, b) => (b.exact - b.w) - (a.exact - a.w))) {
    if (left <= 0) break;
    r.w += 1;
    left -= 1;
  }
  return { pending: floors[0].w, in_progress: floors[1].w, completed: floors[2].w };
}
