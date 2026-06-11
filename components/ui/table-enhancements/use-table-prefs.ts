'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ColumnDef, TableDensity } from './table-toolbar';

interface TablePrefs {
  columns: Record<string, boolean>;
  density: TableDensity;
}

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

export function useTablePrefs(
  tableId: string,
  defaultColumns: ColumnDef[],
  defaultDensity: TableDensity = 'comfortable'
): {
  columns: ColumnDef[];
  setColumns: (cols: ColumnDef[]) => void;
  density: TableDensity;
  setDensity: (d: TableDensity) => void;
} {
  const [columns, setColumnsState] = useState<ColumnDef[]>(() => {
    const saved = loadPrefs(tableId);
    if (saved?.columns) {
      return defaultColumns.map((c) => ({
        ...c,
        visible: saved.columns[c.key] ?? c.visible,
      }));
    }
    return defaultColumns;
  });

  const [density, setDensityState] = useState<TableDensity>(() => {
    const saved = loadPrefs(tableId);
    return saved?.density ?? defaultDensity;
  });

  const setColumns = useCallback(
    (cols: ColumnDef[]) => {
      setColumnsState(cols);
      const visibilityMap: Record<string, boolean> = {};
      for (const c of cols) {
        visibilityMap[c.key] = c.visible;
      }
      savePrefs(tableId, { columns: visibilityMap, density });
    },
    [tableId, density]
  );

  const setDensity = useCallback(
    (d: TableDensity) => {
      setDensityState(d);
      const visibilityMap: Record<string, boolean> = {};
      for (const c of columns) {
        visibilityMap[c.key] = c.visible;
      }
      savePrefs(tableId, { columns: visibilityMap, density: d });
    },
    [tableId, columns]
  );

  return { columns, setColumns, density, setDensity };
}
