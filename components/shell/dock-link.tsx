'use client';
import { useDockActions } from '@/lib/state/dock-state';
import type { DockItem } from '@/lib/state/dock-state';
import { trackRecentItem } from '@/lib/state/recent-items';
import Link from 'next/link';

interface DockLinkProps {
  item: DockItem;
  href?: string; // fallback href for new-tab / context menu
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Hybrid link that opens in the dock on left-click,
 * but respects middle-click / right-click for native browser behavior.
 */
export function DockLink({ item, href, children, className, style }: DockLinkProps) {
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
    <Link
      href={href ?? `/${item.type}s/${item.id}`}
      onClick={handleClick}
      className={className}
      style={style}
    >
      {children}
    </Link>
  );
}
