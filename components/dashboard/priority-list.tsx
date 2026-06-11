'use client';

import Link from 'next/link';
import { cn, dueLabel } from '@/lib/utils';
import { ArrowRight, Inbox, Play, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { transitionTaskAction } from '@/lib/actions/tasks';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  due_date?: string | null;
  clients?: { business_name: string } | { business_name: string }[] | null;
  sub_services?: { name: string } | null;
  users_profile?: { full_name: string } | { full_name: string }[] | null;
}

interface PriorityListProps {
  tasks: Task[];
  href: string;
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



function urgencyBorder(t: Task): string {
  if (t.due_date) {
    const diff = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86_400_000);
    if (diff < 0) return 'border-l-red-500';
    if (diff === 0) return 'border-l-amber-500';
  }
  if (t.status === 'in_progress') return 'border-l-teal-500';
  return 'border-l-transparent';
}

export function PriorityList({ tasks, href, emptyMessage = 'No urgent tasks' }: PriorityListProps) {
  const router = useRouter();

  async function handleComplete(e: React.ChangeEvent<HTMLInputElement>, taskId: string) {
    e.preventDefault();
    if (e.target.checked) {
      const r = await transitionTaskAction({ task_id: taskId, to_status: 'completed' });
      if (r.success) {
        toast.success('Task completed');
        router.refresh();
      } else {
        toast.error(r.error);
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
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
        <div className="space-y-1">
          {tasks.map((t) => {
            const p = priorityLabel(t.priority);
            const isCompleted = t.status === 'completed';
            return (
              <div
                key={t.id}
                className={cn(
                  'group flex items-center gap-3 rounded-lg border-l-2 py-2 px-3 hover:bg-zinc-50 transition-colors',
                  urgencyBorder(t)
                )}
              >
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-600 cursor-pointer"
                    checked={isCompleted}
                    onChange={(e) => handleComplete(e, t.id)}
                    disabled={isCompleted}
                  />
                </div>

                <Link href={`${href}/${t.id}`} className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate group-hover:text-teal-700 transition-colors">{t.sub_services?.name ?? t.title}</div>
                  <div className="text-[11px] text-zinc-500">
                    {clientName(t)}
                    {assigneeName(t) ? ` · ${assigneeName(t)}` : ''}
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0 group-hover:hidden">
                  <span className="text-[11px] text-zinc-500">{dueLabel(t.due_date)}</span>
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', priorityStyles[p] || priorityStyles.medium)}>
                    {p}
                  </span>
                </div>

                <div className="hidden group-hover:flex items-center shrink-0 animate-in fade-in zoom-in duration-200">
                  {t.status === 'pending' ? (
                    <Button variant="ghost" size="sm" className="h-7 text-[11px] text-teal-700 hover:bg-teal-50" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); const r = await transitionTaskAction({ task_id: t.id, to_status: 'in_progress' }); if (r.success) { toast.success('Task started'); router.refresh(); } else toast.error(r.error); }}>
                      <Play className="h-3 w-3 mr-1" /> Start
                    </Button>
                  ) : t.status === 'in_progress' ? (
                    <Button variant="ghost" size="sm" className="h-7 text-[11px] text-zinc-700 hover:bg-zinc-50" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); const r = await transitionTaskAction({ task_id: t.id, to_status: 'completed' }); if (r.success) { toast.success('Task completed'); router.refresh(); } else toast.error(r.error); }}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
