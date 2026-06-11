import { useEffect, useCallback } from 'react';

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function buildKey(namespace: string | undefined, key: string): string {
  return namespace ? `tff-draft:${namespace}:${key}` : `tff-draft:${key}`;
}

export function useAutoSaveState<T>(
  key: string,
  state: T,
  setState: React.Dispatch<React.SetStateAction<T>>,
  enabled: boolean = true,
  namespace?: string
) {
  const fullKey = buildKey(namespace, key);

  // Rehydrate on mount
  useEffect(() => {
    if (!enabled) return;
    try {
      const savedData = localStorage.getItem(fullKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.__timestamp && Date.now() - parsed.__timestamp > TTL_MS) {
          localStorage.removeItem(fullKey);
          return;
        }
        const { __timestamp, ...rest } = parsed;
        setState((prev) => ({ ...rest, ...prev }));
      }
    } catch {
      // Silently ignore corrupted draft data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey, enabled]);

  // Save on changes
  useEffect(() => {
    if (!enabled) return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(fullKey, JSON.stringify({ ...state, __timestamp: Date.now() }));
      } catch {
        // Silently ignore localStorage quota or permission errors
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timeout);
  }, [fullKey, state, enabled]);

  const clearAutoSave = useCallback(() => {
    try {
      localStorage.removeItem(fullKey);
    } catch (e) {
      // Ignore
    }
  }, [fullKey]);

  return { clearAutoSave };
}
