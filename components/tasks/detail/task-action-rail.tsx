'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Pencil, Play, CheckCircle2, RotateCcw, Undo2, XCircle, Ban, AlertTriangle, ShieldAlert, Trash2, ExternalLink, Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRolePrefix } from '@/lib/hooks/use-role-prefix';
import { useDockActions } from '@/lib/state/dock-state';
import { softDeleteTaskAction } from '@/lib/actions/tasks';
import type { TaskDetailCtx } from './use-task-detail';

type Tone = 'primary' | 'success' | 'danger' | 'default';

type Action = { key: string; label: string; icon: ReactNode; onClick?: () => void; href?: string; tone?: Tone; disabled?: boolean; testId?: string; groupEnd?: boolean };

const TONE: Record<Tone, string> = {
  primary: 'border-transparent bg-gradient-to-b from-teal-500 to-teal-600 text-white shadow-[0_4px_12px_rgba(13,148,136,0.3)] hover:from-teal-500 hover:to-teal-700',
  success: 'border-transparent bg-gradient-to-b from-green-500 to-green-600 text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)] hover:from-green-500 hover:to-green-700',
  danger: 'border-[#E8EAEE] bg-white text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600',
  default: 'border-[#E8EAEE] bg-white text-slate-600 hover:border-[#DCDFE5] hover:bg-slate-50 hover:text-slate-900',
};

/** Where the rail sits: an empty element on the pane's left edge, which the dock provides. */
export const DOCK_RAIL_ID = 'dock-rail';

function RailButton({ a, floating }: { a: Action; floating: boolean }) {
  const cls = cn(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border text-[13px] font-medium transition-all disabled:pointer-events-none disabled:opacity-50',
    floating ? 'h-9 px-3.5 shadow-[0_4px_14px_rgba(15,23,42,0.12)]' : 'h-8 px-3',
    TONE[a.tone ?? 'default'],
  );
  const inner = (
    <>
      {a.icon}
      <span>{a.label}</span>
    </>
  );
  if (a.href) {
    return (
      <Link href={a.href} className={cls} data-testid={a.testId}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={a.onClick} disabled={a.disabled} className={cls} data-testid={a.testId}>
      {inner}
    </button>
  );
}

/**
 * Every task action in one place: start, complete, edit, block, stuck, cancel, delete, open full page, copy link.
 * On a wide screen it floats beside the pane's left edge, using the space the pane no longer needs, and every button
 * carries its own label so nothing needs explaining. On a phone it is a scrolling bar at the top of the pane.
 */
export function TaskActionRail({ ctx }: { ctx: TaskDetailCtx }) {
  const prefix = useRolePrefix();
  const { clear } = useDockActions();
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.getElementById(DOCK_RAIL_ID)), []);

  const { task, editMode, editing, setEditing, canEditSteps, canDelete, isClosed, isPending, transitioning, handleTransition, handleBlockedToggle, handleUnstuck, setShowStuckPicker, confirm, router, onRefresh } = ctx;
  const busy = isPending || transitioning !== null;
  const status = task.status;
  const taskUrl = `${prefix}/tasks/${task.id}`;

  async function remove() {
    const ok = await confirm({ title: 'Delete this task?', description: 'It moves to the bin and no longer shows in lists. An admin can restore it.', confirmText: 'Delete task', isDestructive: true });
    if (!ok) return;
    const r = await softDeleteTaskAction(task.id);
    if (!r.success) {
      toast.error(r.error);
      return;
    }
    toast.success('Task deleted');
    clear();
    router.refresh();
    onRefresh?.();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${taskUrl}`);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  }

  const actions: Action[] = [];
  if (canEditSteps) {
    if (status === 'pending') actions.push({ key: 'start', label: 'Start task', icon: <Play className="h-4 w-4" />, tone: 'primary', onClick: () => void handleTransition('in_progress'), disabled: busy, testId: 'stepper-start' });
    if (status === 'in_progress') actions.push({ key: 'complete', label: 'Mark complete', icon: <CheckCircle2 className="h-4 w-4" />, tone: 'success', onClick: () => window.dispatchEvent(new CustomEvent('tff:task-complete', { detail: { taskId: task.id } })), disabled: busy, testId: 'stepper-complete' });
    if (status === 'completed' || status === 'cancelled') actions.push({ key: 'reopen', label: 'Reopen task', icon: <RotateCcw className="h-4 w-4" />, onClick: () => void handleTransition(status === 'completed' ? 'in_progress' : 'pending'), disabled: busy, testId: 'stepper-reopen' });
  }
  if (editMode !== 'none' && !editing) actions.push({ key: 'edit', label: 'Edit details', icon: <Pencil className="h-4 w-4" />, onClick: () => setEditing(true), testId: 'task-edit-button' });
  if (canEditSteps && status === 'in_progress') actions.push({ key: 'back', label: 'Back to pending', icon: <Undo2 className="h-4 w-4" />, onClick: () => void handleTransition('pending'), disabled: busy });
  if (!isClosed) {
    actions.push({ key: 'blocked', label: task.is_blocked_on_client ? 'Unblock' : 'Waiting on client', icon: <Ban className="h-4 w-4" />, tone: task.is_blocked_on_client ? 'primary' : 'default', onClick: handleBlockedToggle, disabled: busy });
    actions.push(
      task.is_stuck
        ? { key: 'unstuck', label: 'Mark unstuck', icon: <ShieldAlert className="h-4 w-4" />, tone: 'primary', onClick: handleUnstuck, disabled: busy }
        : { key: 'stuck', label: 'Mark stuck', icon: <AlertTriangle className="h-4 w-4" />, onClick: () => setShowStuckPicker(true), disabled: busy },
    );
  }
  if (canEditSteps && (status === 'pending' || status === 'in_progress')) actions.push({ key: 'cancel', label: 'Cancel task', icon: <XCircle className="h-4 w-4" />, onClick: () => void handleTransition('cancelled'), disabled: busy });
  if (canDelete) actions.push({ key: 'delete', label: 'Delete task', icon: <Trash2 className="h-4 w-4" />, tone: 'danger', onClick: () => void remove(), disabled: busy });
  actions.push({ key: 'open', label: 'Open full page', icon: <ExternalLink className="h-4 w-4" />, href: taskUrl });
  actions.push({ key: 'copy', label: 'Copy link', icon: <Link2 className="h-4 w-4" />, onClick: () => void copyLink() });

  return (
    <>
      {/* Phone: a scrolling bar inside the pane */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:hidden" role="toolbar" aria-label="Task actions">
        {actions.map((a) => (
          <RailButton key={a.key} a={a} floating={false} />
        ))}
      </div>
      {/* Desktop: a column on the pane's left edge */}
      {host &&
        createPortal(
          <div className="hidden flex-col items-end gap-2 md:flex" role="toolbar" aria-label="Task actions">
            {actions.map((a) => (
              <RailButton key={a.key} a={a} floating />
            ))}
          </div>,
          host,
        )}
    </>
  );
}
