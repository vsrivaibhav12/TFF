'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const isUserAction = useRef(false);

  // Sync URL → stack on external navigation (back/forward, link clicks)
  useEffect(() => {
    if (isUserAction.current) {
      isUserAction.current = false;
      return;
    }
    const dockQuery = searchParams.get('dock');
    const item = parseDockQuery(dockQuery);
    setStack((prev) => {
      // Only update if the top item actually changed to prevent loops
      const top = prev[prev.length - 1];
      if (!item && prev.length === 0) return prev;
      if (item && top && top.type === item.type && top.id === item.id) return prev;
      return item ? [item] : [];
    });
  }, [searchParams]);

  const push = useCallback(
    (item: DockItem) => {
      isUserAction.current = true;
      setStack((prev) => {
        const newStack = [...prev, item];
        const params = new URLSearchParams(window.location.search);
        params.set('dock', `${item.type}:${item.id}`);
        router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
        return newStack;
      });
    },
    [router]
  );

  const pop = useCallback(() => {
    isUserAction.current = true;
    setStack((prev) => {
      if (prev.length <= 1) {
        const params = new URLSearchParams(window.location.search);
        params.delete('dock');
        router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
        return [];
      }
      const newStack = prev.slice(0, -1);
      const top = newStack[newStack.length - 1];
      const params = new URLSearchParams(window.location.search);
      params.set('dock', `${top.type}:${top.id}`);
      router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
      return newStack;
    });
  }, [router]);

  const clear = useCallback(() => {
    isUserAction.current = true;
    setStack([]);
    const params = new URLSearchParams(window.location.search);
    params.delete('dock');
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  }, [router]);

  return (
    <DockStateContext.Provider value={stack}>
      <DockActionsContext.Provider value={{ push, pop, clear }}>
        {children}
      </DockActionsContext.Provider>
    </DockStateContext.Provider>
  );
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
