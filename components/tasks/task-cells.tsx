'use client';

import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { DockLink } from '@/components/shell/dock-link';
import { TaskHoverCard } from '@/components/tasks/task-hover-card';
import { TaskRowEditButton } from '@/components/tasks/task-row-edit-button';
import { TaskLabelPills } from '@/components/tasks/task-label-pills';
import { ProgressMicro } from '@/components/ui/progress-micro';
import { fmtHM } from '@/components/tasks/detail/helpers';
import { cn, displayTaskName, formatDateIST } from '@/lib/utils';
import { formatPeriodColumns } from '@/lib/periods';

/** The task fields the cells read. Both tables pass their own row type, which is a superset of this. */
export type CellTask = {
  id: string;
  task_number?: string | null;
  title?: string;
  status: string;
  priority?: string | null;
  due_date: string | null;
  is_stuck?: boolean | null;
  is_verified?: boolean;
  clients?: { business_name: string } | null;
  users_profile?: { full_name: string } | null;
  sub_services?: { name: string } | null;
  labels?: { code: string; display_name: string; color_hex: string | null }[];
  progress_pct?: number;
  step_total?: number;
  step_completed?: number;
  minutes_logged?: number;
  [k: string]: unknown;
};

const DAY = 86_400_000;
const dayDiff = (iso: string, todayIso: string) =>
  Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / DAY);

/** Due date as a relative chip: "6d late" in red, "Today" in amber, "Tomorrow" and "in 3d" in grey, a date further out. */
export function DuePill({ due, status, todayIso }: { due: string | null; status: string; todayIso: string }) {
  if (!due) return <span className="text-xs text-slate-400">—</span>;
  const closed = status === 'completed' || status === 'cancelled';
  if (closed) return <span className="text-xs tabular-nums text-slate-500">{formatDateIST(due)}</span>;
  const d = dayDiff(due, todayIso);
  if (d < 0) return <span className="tff-pill tff-pill-bad" title={formatDateIST(due)}>{-d}d late</span>;
  if (d === 0) return <span className="tff-pill tff-pill-warn" title={formatDateIST(due)}>Today</span>;
  if (d === 1) return <span className="tff-pill tff-pill-info" title={formatDateIST(due)}>Tomorrow</span>;
  if (d <= 7) return <span className="tff-pill tff-pill-mute" title={formatDateIST(due)}>in {d}d</span>;
  return <span className="text-xs tabular-nums text-slate-600">{formatDateIST(due)}</span>;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'tff-pill-mute' },
  in_progress: { label: 'In progress', cls: 'tff-pill-accent' },
  blocked: { label: 'Waiting on client', cls: 'tff-pill-warn' },
  completed: { label: 'Completed', cls: 'tff-pill-good' },
  cancelled: { label: 'Cancelled', cls: 'tff-pill-mute' },
};

/** Status as a dotted pill. A stuck task shows "Stuck" instead, since that is what needs attention. */
export function StatusPill({ status, stuck }: { status: string; stuck?: boolean | null }) {
  const s = STATUS[status] ?? { label: status.replace(/_/g, ' '), cls: 'tff-pill-mute' };
  if (stuck && status !== 'completed') return <span className="tff-pill tff-pill-info tff-pill-dot">Stuck</span>;
  return <span className={cn('tff-pill tff-pill-dot', s.cls)}>{s.label}</span>;
}

const AVATAR_TONES = ['bg-indigo-100 text-indigo-800', 'bg-pink-100 text-pink-800', 'bg-amber-100 text-amber-800', 'bg-emerald-100 text-emerald-800', 'bg-sky-100 text-sky-800'];
function toneFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

/** Initials avatar plus first name. */
export function OwnerChip({ name }: { name: string | null | undefined }) {
  if (!name) return <span className="text-xs text-slate-400">Unassigned</span>;
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <span className="inline-flex min-w-0 items-center gap-2" title={name}>
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold', toneFor(name))}>{initials}</span>
      <span className="truncate text-xs text-slate-700">{name.split(' ')[0]}</span>
    </span>
  );
}

const PRIORITY_DOT: Record<string, string> = { urgent: 'bg-red-500', high: 'bg-amber-500', medium: 'bg-sky-400', low: 'bg-slate-300' };

export function PriorityPill({ priority }: { priority?: string | null }) {
  if (!priority) return <span className="text-xs text-slate-400">—</span>;
  const cls = priority === 'urgent' ? 'tff-pill-bad' : priority === 'high' ? 'tff-pill-warn' : priority === 'medium' ? 'tff-pill-info' : 'tff-pill-mute';
  return <span className={cn('tff-pill capitalize', cls)}>{priority}</span>;
}

export type CellContext = {
  todayIso: string;
  /** '/admin' or '/team' */
  base: string;
  canEdit: boolean;
  isAdmin: boolean;
  /** Replace the status or priority cell, for example with an inline editor. */
  statusSlot?: (t: CellTask) => ReactNode;
  prioritySlot?: (t: CellTask) => ReactNode;
};

/** The content of one cell. Both tables wrap this in their own row element, in their own column order. */
export function TaskCellContent({ col, t, ctx }: { col: string; t: CellTask; ctx: CellContext }) {
  switch (col) {
    case 'task_number':
      return <span className="font-mono text-xs tabular-nums text-slate-500">{t.task_number ?? '—'}</span>;
    case 'sub_service':
      return (
        <div className="flex min-w-0 items-center gap-2">
          {(t.priority === 'urgent' || t.priority === 'high') && (
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PRIORITY_DOT[t.priority])} title={`${t.priority} priority`} />
          )}
          <TaskHoverCard taskId={t.id}>
            <DockLink item={{ type: 'task', id: t.id }} href={`${ctx.base}/tasks/${t.id}`} className="min-w-0 truncate text-sm font-medium text-slate-900 hover:text-teal-700">
              {displayTaskName(t as never)}
            </DockLink>
          </TaskHoverCard>
          <span className="shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100">
            <TaskRowEditButton taskId={t.id} status={t.status} canEdit={ctx.canEdit} isAdmin={ctx.isAdmin} />
          </span>
          {t.labels && t.labels.length > 0 && <TaskLabelPills labels={t.labels} maxVisible={1} size="xs" />}
        </div>
      );
    case 'client':
      return <span className="block truncate text-[13px] text-slate-600">{t.clients?.business_name ?? '—'}</span>;
    case 'period':
      return <span className="tff-pill tff-pill-mute">{formatPeriodColumns(t as never) || '—'}</span>;
    case 'progress':
      return <ProgressMicro progress={t.progress_pct ?? 0} completed={t.step_completed ?? 0} total={t.step_total ?? 0} />;
    case 'due':
    case 'due_date':
      return <DuePill due={t.due_date} status={t.status} todayIso={ctx.todayIso} />;
    case 'status':
      return ctx.statusSlot ? <>{ctx.statusSlot(t)}</> : <StatusPill status={t.status} stuck={t.is_stuck} />;
    case 'time_spent':
      return <span className="text-xs tabular-nums text-slate-600">{t.minutes_logged ? fmtHM(t.minutes_logged) : '—'}</span>;
    case 'owner':
      return <OwnerChip name={t.users_profile?.full_name} />;
    case 'labels':
      return t.labels && t.labels.length > 0 ? <TaskLabelPills labels={t.labels} maxVisible={3} size="xs" /> : <span className="text-xs text-slate-300">—</span>;
    case 'priority':
      return ctx.prioritySlot ? <>{ctx.prioritySlot(t)}</> : <PriorityPill priority={t.priority} />;
    case 'verified':
      return t.is_verified ? (
        <span className="tff-pill tff-pill-accent"><ShieldCheck className="h-3 w-3" /> Verified</span>
      ) : null;
    default:
      return null;
  }
}
