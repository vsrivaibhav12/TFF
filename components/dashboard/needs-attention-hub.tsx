'use client';
import Link from 'next/link';
import { ArrowRight, MessageSquare, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import { Button } from '@/components/ui/button';

export type AttentionItem = {
  id: string;
  type: 'blocked' | 'query' | 'approval';
  title: string;
  client: string;
  reason: string;
  color: 'amber' | 'red' | 'blue' | 'teal' | 'orange';
  href: string;
};

export function NeedsAttentionHub({ items = [] }: { items?: AttentionItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 tracking-tight">Needs attention</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Blocked tasks, open queries, and approvals</p>
          </div>
        </div>
        <EmptyState title="All clear" body="No items need your immediate attention right now." />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 tracking-tight">Needs attention</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Blocked tasks, open queries, and approvals</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.type === 'blocked' ? Clock : item.type === 'query' ? MessageSquare : ShieldCheck;
          return (
            <div
              key={item.id}
              className="group flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-zinc-100 p-4 hover:border-zinc-200 bg-zinc-50/50 transition-all"
            >
              <div className={`h-10 w-10 rounded-full bg-${item.color}-100 text-${item.color}-600 flex items-center justify-center shrink-0`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-900">{item.title}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {item.client} · <span className={`text-${item.color}-600 font-medium`}>{item.reason}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={item.href}>
                  <Button variant="outline" size="sm" className={`h-8 text-xs border-${item.color}-200 text-${item.color}-700 hover:bg-${item.color}-50`}>
                    {item.type === 'blocked' ? 'View Task' : item.type === 'query' ? 'Reply' : 'Review'}
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
