'use client';
import { useState, useEffect, useCallback } from 'react';

/**
 * Debounced search hook.
 * Returns the immediate value and a debounced value that updates after `delay` ms of inactivity.
 * Use the debounced value for API calls / filtering to avoid query storms.
 */
export function useDebouncedSearch(delay = 300) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), delay);
    return () => clearTimeout(timer);
  }, [query, delay]);

  const clear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return { query, setQuery, debouncedQuery, clear };
}
