'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'tff:inbox:snoozed';

export interface SnoozedItem {
  key: string;
  until: number; // timestamp
}

function loadSnoozed(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function saveSnoozed(map: Record<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function useInboxSnooze() {
  const [snoozed, setSnoozed] = useState<Record<string, number>>(loadSnoozed);

  // Clean up expired snoozes on mount
  useEffect(() => {
    const now = Date.now();
    const cleaned: Record<string, number> = {};
    let changed = false;
    for (const [key, until] of Object.entries(snoozed)) {
      if (until > now) {
        cleaned[key] = until;
      } else {
        changed = true;
      }
    }
    if (changed) {
      setSnoozed(cleaned);
      saveSnoozed(cleaned);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSnoozed = useCallback(
    (itemType: string, itemId: string): boolean => {
      const key = `${itemType}:${itemId}`;
      const until = snoozed[key];
      return !!until && until > Date.now();
    },
    [snoozed]
  );

  const snooze = useCallback(
    (itemType: string, itemId: string, durationMs: number) => {
      const key = `${itemType}:${itemId}`;
      const until = Date.now() + durationMs;
      const next = { ...snoozed, [key]: until };
      setSnoozed(next);
      saveSnoozed(next);
    },
    [snoozed]
  );

  const unsnooze = useCallback(
    (itemType: string, itemId: string) => {
      const key = `${itemType}:${itemId}`;
      const next = { ...snoozed };
      delete next[key];
      setSnoozed(next);
      saveSnoozed(next);
    },
    [snoozed]
  );

  return { isSnoozed, snooze, unsnooze };
}
