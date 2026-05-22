'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn, formatDateIST } from '@/lib/utils';
import { Calendar, AlertTriangle, Briefcase, Bell, MessageSquare } from 'lucide-react';
import { ProgressRing } from '@/components/ui/progress-ring';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    status: string;
    priority?: string | null;
    due_date?: string | null;
    clients?: { business_name: string } | { business_name: string }[] | null;
    is_blocked_on_client?: boolean;
    is_stuck?: boolean;
    assignee?: { full_name?: string | null } | null;
    work_item_type?: string;
    work_item_label?: string;
    progress_pct?: number;
  };
  hrefPrefix?: string;
}

const priorityStyles: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-teal-50 text-teal-700 border-teal-200',
};

const typeIcons: Record<string, React.ReactNode> = {
  task: <Briefcase className="h-3 w-3" />,
  notice: <Bell className="h-3 w-3" />,
  query: <MessageSquare className="h-3 w-3" />,
};

const typeColors: Record<string, string> = {
  task: 'bg-blue-50 text-blue-600 border-blue-100',
  notice: 'bg-red-50 text-red-600 border-red-100',
  query: 'bg-purple-50 text-purple-600 border-purple-100',
};

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function isOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function clientName(task: TaskCardProps['task']): string {
  const c = task.clients;
  if (!c) return '';
  if (Array.isArray(c)) return c[0]?.business_name ?? '';
  return c.business_name ?? '';
}

export function TaskCard({ task, hrefPrefix = '/admin/tasks' }: TaskCardProps) {
  const p = (task.priority ?? 'medium').toLowerCase();
  const overdue = isOverdue(task.due_date);
  const workType = task.work_item_type ?? 'task';
  const progress = task.progress_pct ?? 0;

  return (
    <Link
      href={`${hrefPrefix}/${task.id}`}
      className="group block rounded-xl bg-white p-4 hover:shadow-md transition-all border border-transparent hover:border-zinc-100"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      {/* Top row: type + priority */}
      <div className="flex items-center justify-between gap-2">
        <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium', typeColors[workType] || typeColors.task)}>
          {typeIcons[workType] || typeIcons.task}
          {task.work_item_label ?? 'Task'}
        </div>
        <Badge variant="outline" className={cn('text-[10px] shrink-0', priorityStyles[p] || priorityStyles.medium)}>
          {p}
        </Badge>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-zinc-900 mt-2.5 line-clamp-2 group-hover:text-teal-700 transition-colors">
        {task.title}
      </h4>

      {/* Client */}
      {clientName(task) && (
        <p className="text-xs text-zinc-500 mt-1 truncate">{clientName(task)}</p>
      )}

      {/* Bottom row: due date + progress ring */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Calendar className="h-3 w-3" />
          <span className={cn(overdue && 'text-red-500 font-medium')}>{task.due_date ? formatDateIST(task.due_date) : 'No due date'}</span>
        </div>
        {task.assignee?.full_name && (
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-[8px] font-bold shrink-0" title={task.assignee.full_name}>
            {getInitials(task.assignee.full_name)}
          </div>
        )}
      </div>

      {/* Progress ring */}
      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
        <span className="text-[10px] text-zinc-400 font-medium">{progress}% complete</span>
        <ProgressRing progress={progress} size={28} strokeWidth={3} hideLabel gradient />
      </div>

      {(task.is_blocked_on_client || task.is_stuck) && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1">
          <AlertTriangle className="h-3 w-3" />
          {task.is_blocked_on_client ? 'Awaiting client' : 'Stuck'}
        </div>
      )}
    </Link>
  );
}
