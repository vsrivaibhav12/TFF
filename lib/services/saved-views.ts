// Pure rules for saved views: which URL filters are kept, and what a table layout may contain.
// The database stores whatever the app hands it, so the app cleans both before saving and before applying.

export const SAVED_VIEW_SCOPES = ['tasks'] as const;
export type SavedViewScope = (typeof SAVED_VIEW_SCOPES)[number];

/** URL filters a task view may keep. Paging and the open side panel are never part of a view. */
const TASK_FILTER_KEYS = new Set([
  'q', 'status', 'assigned', 'client', 'priority', 'due_from', 'due_to', 'period_year', 'period_month', 'period_quarter',
  'sub_service', 'label', 'is_stuck', 'is_billable', 'is_verified', 'verification', 'group',
]);

const MAX_VALUE = 200;

/** Keeps only the known filters, drops empty values, and returns a stable query string (sorted by key). */
export function sanitizeQuery(raw: string, scope: SavedViewScope = 'tasks'): string {
  const allowed = scope === 'tasks' ? TASK_FILTER_KEYS : new Set<string>();
  const src = new URLSearchParams(raw.replace(/^\?/, ''));
  const entries: Array<[string, string]> = [];
  for (const [k, v] of src.entries()) {
    const value = v.trim().slice(0, MAX_VALUE);
    if (allowed.has(k) && value) entries.push([k, value]);
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const out = new URLSearchParams();
  for (const [k, v] of entries) out.append(k, v);
  return out.toString();
}

export type TableLayout = {
  /** Column keys in the order shown. */
  order: string[];
  /** Columns the person turned on or off. A key that is absent keeps the page default. */
  visible: Record<string, boolean>;
  density?: 'compact' | 'comfortable';
};

const KEY_RE = /^[a-z][a-z0-9_]{0,30}$/;

/** Accepts anything and returns a safe layout: valid keys only, no duplicates, at most 30 columns. */
export function normalizeLayout(raw: unknown): TableLayout {
  const out: TableLayout = { order: [], visible: {} };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.order)) {
    const seen = new Set<string>();
    for (const k of r.order) {
      if (typeof k === 'string' && KEY_RE.test(k) && !seen.has(k) && seen.size < 30) {
        seen.add(k);
        out.order.push(k);
      }
    }
  }
  if (r.visible && typeof r.visible === 'object') {
    for (const [k, v] of Object.entries(r.visible as Record<string, unknown>)) {
      if (KEY_RE.test(k) && typeof v === 'boolean' && Object.keys(out.visible).length < 30) out.visible[k] = v;
    }
  }
  if (r.density === 'compact' || r.density === 'comfortable') out.density = r.density;
  return out;
}

/**
 * Applies a saved order to the columns a page has. Unknown saved keys are ignored; columns the layout does not
 * mention keep their place after the ones it does, and pinned columns (the checkbox first, actions last) stay put.
 */
export function orderColumns<T extends { key: string }>(columns: T[], order: string[], pinnedStart: string[] = ['select'], pinnedEnd: string[] = ['actions']): T[] {
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const start = pinnedStart.map((k) => byKey.get(k)).filter((c): c is T => !!c);
  const end = pinnedEnd.map((k) => byKey.get(k)).filter((c): c is T => !!c);
  const pinned = new Set([...pinnedStart, ...pinnedEnd]);
  const middle: T[] = [];
  const placed = new Set<string>();
  for (const k of order) {
    const c = byKey.get(k);
    if (c && !pinned.has(k) && !placed.has(k)) {
      middle.push(c);
      placed.add(k);
    }
  }
  for (const c of columns) if (!pinned.has(c.key) && !placed.has(c.key)) middle.push(c);
  return [...start, ...middle, ...end];
}

export type SavedViewInput = { scope: SavedViewScope; name: string; query: string; layout: TableLayout; is_shared: boolean };

export function parseSavedViewInput(raw: { scope?: unknown; name?: unknown; query?: unknown; layout?: unknown; is_shared?: unknown }): { ok: true; value: SavedViewInput } | { ok: false; error: string } {
  const scope = SAVED_VIEW_SCOPES.find((s) => s === raw.scope);
  if (!scope) return { ok: false, error: 'Unknown view type' };
  const name = typeof raw.name === 'string' ? raw.name.trim().replace(/\s+/g, ' ') : '';
  if (!name) return { ok: false, error: 'Give the view a name' };
  if (name.length > 60) return { ok: false, error: 'Keep the name to 60 characters' };
  const query = sanitizeQuery(typeof raw.query === 'string' ? raw.query : '', scope);
  return { ok: true, value: { scope, name, query, layout: normalizeLayout(raw.layout), is_shared: raw.is_shared === true } };
}
