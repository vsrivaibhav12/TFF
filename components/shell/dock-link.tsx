'use client';
import { forwardRef } from 'react';
import { useDockActions } from '@/lib/state/dock-state';
import type { DockItem } from '@/lib/state/dock-state';
import { trackRecentItem } from '@/lib/state/recent-items';
import Link from 'next/link';

interface DockLinkProps extends Omit<React.ComponentPropsWithoutRef<'a'>, 'href' | 'onClick'> {
  item: DockItem;
  href?: string; // fallback href for new-tab / context menu
  children: React.ReactNode;
}

/**
 * Hybrid link that opens in the dock on left-click,
 * but respects middle-click / right-click for native browser behavior.
 * It forwards its ref and extra props so it can be a Radix `asChild` trigger.
 */
export const DockLink = forwardRef<HTMLAnchorElement, DockLinkProps>(function DockLink(
  { item, href, children, ...rest },
  ref,
) {
  const { push } = useDockActions();

  const handleClick = (e: React.MouseEvent) => {
    // Allow ctrl+click / cmd+click / middle-click to open in new tab
    if (e.ctrlKey || e.metaKey || e.button !== 0) return;
    e.preventDefault();
    // Track for contextual panel recent items
    const label = (e.currentTarget as HTMLElement).textContent?.trim() ?? item.type;
    trackRecentItem({ type: item.type, id: item.id, label, timestamp: Date.now() });
    push(item);
  };

  return (
    <Link ref={ref} {...rest} href={href ?? `/${item.type}s/${item.id}`} onClick={handleClick}>
      {children}
    </Link>
  );
});
