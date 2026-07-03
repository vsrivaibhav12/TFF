'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export interface DockItem {
  type: 'task' | 'client' | 'notice' | 'query' | 'team';
  id: string;
}

export type DockState = DockItem[];

export interface DockActions {
  push: (item: DockItem) => void;
  pop: () => void;
  clear: () => void;
}

const DockStateContext = createContext<DockState | undefined>(undefined);
const DockActionsContext = createContext<DockActions | undefined>(undefined);

function parseDockQuery(value: string | null): DockItem | null {
  if (!value) return null;
  const [type, ...rest] = value.split(':');
  const id = rest.join(':'); // allow IDs with colons
  if (!type || !id) return null;
  const validTypes: DockItem['type'][] = ['task', 'client', 'notice', 'query', 'team'];
  if (!validTypes.includes(type as DockItem['type'])) return null;
  return { type: type as DockItem['type'], id };
}

export function DockProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<DockState>([]);
  const router = useRouter();
  const isUserAction = useRef(false);

  const updateUrl = useCallback((nextStack: DockState) => {
    const params = new URLSearchParams(window.location.search);
    const top = nextStack[nextStack.length - 1];
    if (top) params.set('dock', `${top.type}:${top.id}`);
    else params.delete('dock');
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  }, [router]);

  const push = useCallback((item: DockItem) => {
    isUserAction.current = true;
    setStack((prev) => {
      const next = [...prev, item];
      updateUrl(next);
      return next;
    });
  }, [updateUrl]);

  const pop = useCallback(() => {
    isUserAction.current = true;
    setStack((prev) => {
      if (prev.length <= 1) {
        updateUrl([]);
        return [];
      }
      const next = prev.slice(0, -1);
      updateUrl(next);
      return next;
    });
  }, [updateUrl]);

  const clear = useCallback(() => {
    isUserAction.current = true;
    setStack([]);
    updateUrl([]);
  }, [updateUrl]);

  const actions = useMemo<DockActions>(() => ({ push, pop, clear }), [push, pop, clear]);

  return (
    <DockStateContext.Provider value={stack}>
      <DockActionsContext.Provider value={actions}>
        {children}
        <DockUrlSync setStack={setStack} isUserAction={isUserAction} />
      </DockActionsContext.Provider>
    </DockStateContext.Provider>
  );
}

/**
 * Reads the URL `?dock=` query and syncs it to the dock stack.
 * Kept as a separate child so that changes to unrelated query params
 * do not re-render the DockProvider or the rest of the app tree.
 */
function DockUrlSync({
  setStack,
  isUserAction,
}: {
  setStack: React.Dispatch<React.SetStateAction<DockState>>;
  isUserAction: React.MutableRefObject<boolean>;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isUserAction.current) {
      isUserAction.current = false;
      return;
    }
    const dockQuery = searchParams.get('dock');
    const item = parseDockQuery(dockQuery);
    setStack((prev) => {
      const top = prev[prev.length - 1];
      if (!item && prev.length === 0) return prev;
      if (item && top && top.type === item.type && top.id === item.id) return prev;
      return item ? [item] : [];
    });
  }, [searchParams, setStack, isUserAction]);

  return null;
}

export function useDockState() {
  const context = useContext(DockStateContext);
  if (context === undefined) throw new Error('useDockState must be used within DockProvider');
  return context;
}

export function useDockActions() {
  const context = useContext(DockActionsContext);
  if (context === undefined) {
    return { push: () => {}, pop: () => {}, clear: () => {} };
  }
  return context;
}
