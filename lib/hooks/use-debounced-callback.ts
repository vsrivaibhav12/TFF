'use client';
import { useRef, useCallback } from 'react';

/**
 * Returns a debounced version of the provided callback.
 * The callback is invoked after `delay` ms of inactivity.
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay = 300
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  );
}
