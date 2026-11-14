'use client';

import { useState, useEffect, useCallback } from 'react';
import { orderColumns, type TableLayout } from '@/lib/services/saved-views';
import type { ColumnDef, TableDensity } from './table-toolbar';

interface TablePrefs {
  columns: Record<string, boolean>;
  density: TableDensity;
  order?: string[];
}

const EVENT = 'tff:table-prefs';

function getStorageKey(tableId: string): string {
  return `tff:table-prefs:${tableId}`;
}

function loadPrefs(tableId: string): TablePrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getStorageKey(tableId));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function savePrefs(tableId: string, prefs: TablePrefs) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(tableId), JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

/** The layout this browser currently has for a table: column order, which columns are on, and density. */
export function readTableLayout(tableId: string, defaultColumns: ColumnDef[]): TableLayout {
  const saved = loadPrefs(tableId);
  const cols = buildColumns(defaultColumns, saved);
  return {
    order: cols.map((c) => c.key),
    visible: Object.fromEntries(cols.map((c) => [c.key, c.visible])),
    density: saved?.density,
  };
}

/** What this browser has stored for a table, without any page defaults. Empty when nothing was ever changed. */
export function readStoredLayout(tableId: string): TableLayout {
  const saved = loadPrefs(tableId);
  if (!saved) return { order: [], visible: {} };
  return { order: saved.order ?? [], visible: saved.columns ?? {}, density: saved.density };
}

/** Applies a layout (for example from a saved view) and tells any open table to reload it. */
export function writeTableLayout(tableId: string, layout: TableLayout, defaultDensity: TableDensity = 'compact') {
  savePrefs(tableId, { columns: layout.visible, order: layout.order, density: layout.density ?? defaultDensity });
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: { tableId } }));
}

function buildColumns(defaults: ColumnDef[], saved: TablePrefs | null): ColumnDef[] {
  if (!saved) return defaults;
  const withVisibility = defaults.map((c) => ({ ...c, visible: c.optional === false ? true : (saved.columns?.[c.key] ?? c.visible) }));
  return saved.order ? orderColumns(withVisibility, saved.order) : withVisibility;
}

export function useTablePrefs(
  tableId: string,
  defaultColumns: ColumnDef[],
  defaultDensity: TableDensity = 'comfortable'
): {
  columns: ColumnDef[];
  setColumns: (cols: ColumnDef[]) => void;
  density: TableDensity;
  setDensity: (d: TableDensity) => void;
  resetLayout: () => void;
} {
  // Start from the page defaults so the first render matches the server's HTML, then apply this browser's saved
  // layout once the page has hydrated. Reading localStorage during the first render causes a hydration mismatch.
  const [columns, setColumnsState] = useState<ColumnDef[]>(defaultColumns);
  const [density, setDensityState] = useState<TableDensity>(defaultDensity);

  // Loads the saved layout after hydration. A saved view, or another tab, can also change it while the table is open.
  useEffect(() => {
    function reload() {
      const saved = loadPrefs(tableId);
      setColumnsState(buildColumns(defaultColumns, saved));
      setDensityState(saved?.density ?? defaultDensity);
    }
    function onEvent(e: Event) {
      if ((e as CustomEvent).detail?.tableId === tableId) reload();
    }
    function onStorage(e: StorageEvent) {
      if (e.key === getStorageKey(tableId)) reload();
    }
    reload();
    window.addEventListener(EVENT, onEvent);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT, onEvent);
      window.removeEventListener('storage', onStorage);
    };
    // The default columns are a module constant on every page that uses this hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  const setColumns = useCallback(
    (cols: ColumnDef[]) => {
      setColumnsState(cols);
      savePrefs(tableId, { columns: Object.fromEntries(cols.map((c) => [c.key, c.visible])), order: cols.map((c) => c.key), density });
    },
    [tableId, density]
  );

  const setDensity = useCallback(
    (d: TableDensity) => {
      setDensityState(d);
      savePrefs(tableId, { columns: Object.fromEntries(columns.map((c) => [c.key, c.visible])), order: columns.map((c) => c.key), density: d });
    },
    [tableId, columns]
  );

  const resetLayout = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey(tableId));
    } catch {
      // ignore
    }
    setColumnsState(defaultColumns);
    setDensityState(defaultDensity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  return { columns, setColumns, density, setDensity, resetLayout };
}
