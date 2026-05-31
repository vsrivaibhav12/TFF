'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, ArrowRight, Inbox, Play, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Task {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  due_date?: string | null;
  clients?: { business_name: string } | { business_name: string }[] | null;
  users_profile?: { full_name: string } | { full_name: string }[] | null;
}

interface PriorityListProps {
  tasks: Task[];
  href?: string;
  emptyMessage?: string;
}

const priorityStyles: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-teal-50 text-teal-700 border-teal-200',
};

const priorityLabel = (p?: string | null) => {
  if (!p) return 'medium';
  return p.toLowerCase();
};

function clientName(t: Task): string {
  const c = t.clients;
  if (!c) return '';
  if (Array.isArray(c)) return c[0]?.business_name ?? '';
  return c.business_name ?? '';
}

function assigneeName(t: Task): string {
  const u = t.users_profile;
  if (!u) return '';
  if (Array.isArray(u)) return u[0]?.full_name ?? '';
  return u.full_name ?? '';
}

function dueLabel(due?: string | null): string {
  if (!due) return 'No due date';
  const diff = Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff} days`;
}

export function PriorityList({ tasks, href = '/admin/tasks', emptyMessage = 'No urgent tasks' }: PriorityListProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 tracking-tight">Today&apos;s priorities</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Tasks needing attention</p>
        </div>
        <Link href={href} className="text-xs text-teal-700 hover:underline font-medium inline-flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
          <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center mb-3 border border-zinc-100">
            <Inbox className="h-5 w-5 text-zinc-300" />
          </div>
          <p className="text-sm text-zinc-400 font-medium">{emptyMessage}</p>
          <p className="text-xs text-zinc-400 mt-1">Check back later for updates.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const p = priorityLabel(t.priority);
            return (
              <Link
                key={t.id}
                href={`${href}/${t.id}`}
                className="group flex items-center gap-3 rounded-xl border border-zinc-100 p-3 hover:border-teal-200 hover:bg-teal-50/30 transition-all"
              >
                <div className="h-9 w-9 rounded-lg bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-200">
                  <Clock className="h-4 w-4 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate group-hover:text-teal-700 transition-colors">{t.title}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {clientName(t)}
                    {assigneeName(t) ? ` · ${assigneeName(t)}` : ''}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 group-hover:hidden">
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', priorityStyles[p] || priorityStyles.medium)}>
                    {p}
                  </span>
                  <span className="text-[10px] text-zinc-400">{dueLabel(t.due_date)}</span>
                </div>
                <div className="hidden group-hover:flex items-center shrink-0 animate-in fade-in zoom-in duration-200">
                  {t.status === 'pending' ? (
                    <Button variant="outline" size="sm" className="h-8 text-xs border-teal-200 text-teal-700 hover:bg-teal-50">
                      <Play className="h-3 w-3 mr-1" /> Start
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="h-8 text-xs border-zinc-200 text-zinc-700 hover:bg-zinc-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                    </Button>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
