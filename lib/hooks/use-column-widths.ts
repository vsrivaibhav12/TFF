'use client';

import { useState, useEffect, useCallback } from 'react';

export function useColumnWidths(storageKey: string, defaults: Record<string, number>) {
  const [widths, setWidths] = useState<Record<string, number>>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`tff:col-widths:${storageKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        setWidths((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(`tff:col-widths:${storageKey}`, JSON.stringify(widths));
  }, [widths, loaded, storageKey]);

  const setWidth = useCallback((key: string, width: number) => {
    setWidths((prev) => ({ ...prev, [key]: Math.max(60, width) }));
  }, []);

  return { widths, setWidth, loaded };
}
