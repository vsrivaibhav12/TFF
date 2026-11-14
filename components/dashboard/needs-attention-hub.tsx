'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';

export type AttentionItem = {
  id: string;
  type: 'blocked' | 'approval';
  title: string;
  client: string;
  reason: string;
  color: 'amber' | 'red' | 'blue' | 'teal' | 'orange';
  href: string;
  amount?: number;
  amountLabel?: string;
};

// Static class names so Tailwind keeps them (interpolated names are purged at build time).
const DOT: Record<AttentionItem['color'], string> = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  orange: 'bg-amber-500',
  blue: 'bg-teal-500',
  teal: 'bg-teal-500',
};
const REASON: Record<AttentionItem['color'], string> = {
  red: 'text-red-700',
  amber: 'text-amber-700',
  orange: 'text-amber-700',
  blue: 'text-teal-700',
  teal: 'text-teal-700',
};

export function NeedsAttentionHub({ items = [] }: { items?: AttentionItem[] }) {
  return (
    <div className="tff-card p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="tff-section-title">Needs attention</h3>
        <span className="text-xs text-slate-500">Overdue, stuck and awaiting approval</span>
      </div>

      {items.length === 0 ? (
        <EmptyState title="All clear" body="No items need your immediate attention right now." variant="all-clear" />
      ) : (
        <ul className="-mx-2 divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50 transition-colors"
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${DOT[item.color]}`} aria-hidden />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{item.title}</div>
                  <div className="text-xs text-slate-500 truncate">{item.client}</div>
                </div>
                <span className={`text-xs font-medium shrink-0 ${REASON[item.color]}`}>
                  {item.reason}
                  {item.amountLabel ? ` · ${item.amountLabel}` : ''}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
