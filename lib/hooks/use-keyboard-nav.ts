import { useEffect, useState, useCallback } from 'react';

/**
 * Keyboard navigation hook for lists.
 * - j / ArrowDown = move focus down
 * - k / ArrowUp = move focus up
 * - Enter = select focused item
 * - x = toggle selection (multi-select)
 *
 * Skips activation when focus is inside input/textarea/contenteditable.
 */
export function useKeyboardNav({
  itemCount,
  onSelect,
  onToggle,
  enabled = true,
}: {
  itemCount: number;
  onSelect?: (index: number) => void;
  onToggle?: (index: number) => void;
  enabled?: boolean;
}) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || itemCount === 0) return;

      const target = e.target as HTMLElement;
      if (target?.matches?.('input, textarea, select, [contenteditable]')) return;

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev < itemCount - 1 ? prev + 1 : prev;
            return next;
          });
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : 0;
            return next;
          });
          break;
        case 'Enter':
          if (focusedIndex >= 0 && focusedIndex < itemCount) {
            e.preventDefault();
            onSelect?.(focusedIndex);
          }
          break;
        case 'x':
          if (focusedIndex >= 0 && focusedIndex < itemCount) {
            e.preventDefault();
            setSelectedIndices((prev) => {
              const next = new Set(prev);
              if (next.has(focusedIndex)) {
                next.delete(focusedIndex);
              } else {
                next.add(focusedIndex);
              }
              return next;
            });
            onToggle?.(focusedIndex);
          }
          break;
        case 'Escape':
          setFocusedIndex(-1);
          setSelectedIndices(new Set());
          break;
      }
    },
    [enabled, itemCount, focusedIndex, onSelect, onToggle]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset focus when item count changes
  useEffect(() => {
    setFocusedIndex(-1);
    setSelectedIndices(new Set());
  }, [itemCount]);

  return {
    focusedIndex,
    selectedIndices,
    setFocusedIndex,
    clearSelection: () => setSelectedIndices(new Set()),
  };
}
