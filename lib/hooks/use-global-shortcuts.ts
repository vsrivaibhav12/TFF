import { useEffect } from 'react';

type ShortcutMap = {
  [key: string]: (e: KeyboardEvent) => void;
};

export function useGlobalShortcuts(shortcuts: ShortcutMap, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Allow '?' and 'Escape' even when typing in some cases, but generally block alphabetic shortcuts
      const activeEl = document.activeElement as HTMLElement | null;
      const isTyping =
        activeEl &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
          activeEl.isContentEditable);

      // We allow 'Escape' to always bubble (to close modals/docks).
      // We allow '?' (Shift + /) to show help even if typing (unless in a text area maybe, but let's be careful).
      // For safety, if user is typing, we ONLY allow Escape.
      if (isTyping && e.key !== 'Escape') {
        return;
      }

      // Check for exact key match
      const handler = shortcuts[e.key];
      if (handler) {
        handler(e);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}
