import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook: Submits the nearest form on Cmd+Enter / Ctrl+Enter.
 * Attach the returned ref to the <form> element.
 */
export function useCmdEnter<T extends HTMLFormElement>() {
  const formRef = useRef<T>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      const target = e.target as HTMLElement;
      // Only trigger if the active element is inside our form
      if (formRef.current?.contains(target)) {
        e.preventDefault();
        // Find and click the submit button, or request submit
        const submitBtn = formRef.current.querySelector(
          'button[type="submit"], input[type="submit"]'
        ) as HTMLElement | null;
        if (submitBtn) {
          submitBtn.click();
        } else {
          formRef.current.requestSubmit();
        }
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return formRef;
}
