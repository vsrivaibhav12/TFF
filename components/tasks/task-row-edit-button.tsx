'use client';

import { Pencil } from 'lucide-react';
import { useDockActions } from '@/lib/state/dock-state';
import { taskEditMode } from '@/lib/services/task-modify-guard';

/** Always-visible Edit button for a task row. Opens the task panel with the edit form showing. */
export function TaskRowEditButton({
  taskId,
  status,
  canEdit,
  isAdmin,
}: {
  taskId: string;
  status: string;
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const { push } = useDockActions();
  if (taskEditMode({ status }, { canEdit, isAdmin }) === 'none') return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        push({ type: 'task', id: taskId, mode: 'edit' });
      }}
      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-teal-700"
      aria-label="Edit task"
      data-testid="task-row-edit"
    >
      <Pencil className="h-3 w-3" /> Edit
    </button>
  );
}
