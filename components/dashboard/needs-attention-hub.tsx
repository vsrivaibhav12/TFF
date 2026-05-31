'use client';
import Link from 'next/link';
import { ArrowRight, AlertCircle, MessageSquare, Clock, ShieldCheck } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import { Button } from '@/components/ui/button';

export function NeedsAttentionHub({ items = [] }: { items?: any[] }) {
  // In a real implementation, this would take specific blocked tasks, unanswered queries, and approvals.
  // We'll mock a few to demonstrate the UI pattern requested by the user.
  
  const mockItems = [
    { type: 'blocked', title: 'Audit Report FY 23-24', client: 'ABC Pvt. Ltd.', reason: 'Awaiting client documents', icon: Clock, color: 'amber' },
    { type: 'query', title: 'Clarification on GST Input', client: 'R.K. Industries', reason: 'Unanswered for 2 days', icon: MessageSquare, color: 'red' },
    { type: 'approval', title: 'Leave Request: Rahul Verma', client: 'Internal', reason: 'Pending approval', icon: ShieldCheck, color: 'blue' }
  ];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 tracking-tight">Needs attention</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Blocked tasks, open queries, and approvals</p>
        </div>
        <Link href="/admin/work" className="text-xs text-teal-700 hover:underline font-medium inline-flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {mockItems.map((item, i) => (
          <div
            key={i}
            className="group flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-zinc-100 p-4 hover:border-zinc-200 bg-zinc-50/50 transition-all"
          >
            <div className={`h-10 w-10 rounded-full bg-${item.color}-100 text-${item.color}-600 flex items-center justify-center shrink-0`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-zinc-900">{item.title}</div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {item.client} · <span className={`text-${item.color}-600 font-medium`}>{item.reason}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity">
              {item.type === 'blocked' && (
                <Button variant="outline" size="sm" className="h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50">
                  Send Reminder
                </Button>
              )}
              {item.type === 'query' && (
                <Button variant="outline" size="sm" className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50">
                  Reply
                </Button>
              )}
              {item.type === 'approval' && (
                <Button variant="outline" size="sm" className="h-8 text-xs border-teal-200 text-teal-700 hover:bg-teal-50">
                  Approve
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
