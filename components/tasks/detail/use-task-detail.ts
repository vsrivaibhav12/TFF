'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateTaskAction, addTaskNoteAction, transitionTaskAction } from '@/lib/actions/tasks';
import { addManualWorkDoneAction, deleteWorkDoneAction } from '@/lib/actions/workdone';
import { setTaskBlockedOnClientAction, setTaskStuckAction } from '@/lib/actions/task-flags';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/use-confirm';
import { taskEditMode } from '@/lib/services/task-modify-guard';
import type { Props } from './types';

/** All state and handlers for the task detail view; both layouts read from this one object. */
export function useTaskDetail(props: Props) {
  const {
    task: serverTask,
    activity,
    notes,
    team,
    steps,
    cfDefs,
    cfValues,
    allLabels,
    assignedLabels,
    workdone,
    subServices,
    taskTemplates,
    currentUserId,
    canEdit,
    canEditSteps,
    canDelete,
    isAdmin,
    canAssign,
    clientGstFrequency,
    startInEdit,
    basePath,
    clientPath,
    isModal,
    onRefresh,
  } = props;
  const router = useRouter();

  // Optimistic status: the screen shows the new status the moment the user acts, without waiting
  // for the server round trip and the refetch. It is cleared when fresh server data arrives
  // and rolled back if the server refuses the change.
  const [optimistic, setOptimistic] = useState<{ status: string; started_date?: string | null; completed_date?: string | null } | null>(null);
  const [transitioning, setTransitioning] = useState<string | null>(null);
  useEffect(() => {
    setOptimistic(null);
  }, [serverTask.id, serverTask.status]);
  const task = optimistic ? { ...serverTask, ...optimistic } : serverTask;

  const isClosed = task.status === 'completed' || task.status === 'cancelled';
  const editMode = taskEditMode(task, { canEdit, isAdmin });
  const [editing, setEditing] = useState(!!startInEdit && editMode !== 'none');
  // If the task becomes uneditable while the form is open (for example it was completed), close the form.
  useEffect(() => {
    if (editMode === 'none') setEditing(false);
  }, [editMode]);

  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [descExpanded, setDescExpanded] = useState(false);
  const [showStuckPicker, setShowStuckPicker] = useState(false);
  const [stuckReason, setStuckReason] = useState('');
  const [isPending, startTransition] = useTransition();

  // Work logging inline state for dock
  const [showWorkLog, setShowWorkLog] = useState(false);
  const [workMinutes, setWorkMinutes] = useState('');
  const [workDesc, setWorkDesc] = useState('');
  const [workStartTime, setWorkStartTime] = useState('');
  const [workEndTime, setWorkEndTime] = useState('');
  const [loggingWork, setLoggingWork] = useState(false);
  const [workPending, startWorkTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  async function addNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    const r = await addTaskNoteAction({ task_id: task.id, body: newNote.trim() });
    setAddingNote(false);
    if (!r.success) { toast.error(r.error); return; }
    toast.success('Note added');
    setNewNote('');
    onRefresh?.();
  }

  async function saveField(updates: Record<string, unknown>, onSuccess?: () => void) {
    setSaving(true);
    const r = await updateTaskAction({ task_id: task.id, ...updates });
    setSaving(false);
    if (!r.success) { toast.error(r.error); return false; }
    toast.success('Updated');
    onSuccess?.();
    onRefresh?.();
    return true;
  }

  /**
   * Move the task to a new status. The screen updates immediately (optimistic), then the
   * list behind the panel and the panel's own data are refreshed. Resolves true on success.
   */
  async function handleTransition(
    toStatus: import('@/lib/validation/schemas').TaskStatus,
    extra?: { note?: string; bill_reference?: string | null; bill_amount?: number | null; arn_reference?: string | null },
  ): Promise<boolean> {
    const today = new Date().toISOString().slice(0, 10);
    const before = optimistic;
    setTransitioning(toStatus);
    setOptimistic({
      status: toStatus,
      started_date: toStatus === 'in_progress' ? (task.started_date ?? today) : task.started_date,
      completed_date: toStatus === 'completed' ? today : toStatus === 'in_progress' || toStatus === 'pending' ? null : task.completed_date,
    });
    const r = await transitionTaskAction({ task_id: task.id, to_status: toStatus, ...extra });
    setTransitioning(null);
    if (!r.success) {
      setOptimistic(before);
      toast.error(r.error);
      return false;
    }
    const messages: Record<string, string> = {
      in_progress: 'Task started',
      completed: 'Task completed',
      pending: 'Task moved back to pending',
      cancelled: 'Task cancelled',
    };
    toast.success(messages[toStatus] ?? `Moved to ${toStatus.replace('_', ' ')}`);
    router.refresh();
    onRefresh?.();
    return true;
  }

  function handleBlockedToggle() {
    startTransition(async () => {
      const r = await setTaskBlockedOnClientAction({ task_id: task.id, is_blocked_on_client: !task.is_blocked_on_client });
      if (!r.success) toast.error(r.error);
      else toast.success(task.is_blocked_on_client ? 'Unblocked' : 'Blocked on client');
      onRefresh?.();
    });
  }

  function handleMarkStuck() {
    if (!stuckReason) return;
    startTransition(async () => {
      const r = await setTaskStuckAction({ task_id: task.id, is_stuck: true, reason_code: stuckReason as 'client_clarification' | 'gst_portal_down' | 'itd_portal_down' | 'mcadown' | 'mismatch_investigation' | 'awaiting_third_party' | 'awaiting_management' | 'dsc_issue' | 'payment_pending' | 'other', reason_note: null });
      if (!r.success) toast.error(r.error);
      else { toast.success('Task marked as stuck'); setShowStuckPicker(false); setStuckReason(''); }
      onRefresh?.();
    });
  }

  function handleUnstuck() {
    startTransition(async () => {
      const r = await setTaskStuckAction({ task_id: task.id, is_stuck: false });
      if (!r.success) toast.error(r.error);
      else toast.success('Task unstuck');
      onRefresh?.();
    });
  }

  async function submitWorkLog() {
    const mins = parseInt(workMinutes, 10);
    if (!mins || mins <= 0) { toast.error('Enter valid minutes'); return; }
    setLoggingWork(true);
    const workDate = new Date().toISOString().slice(0, 10);
    const startedAt = workStartTime ? new Date(`${workDate}T${workStartTime}:00`).toISOString() : null;
    const endedAt = workEndTime ? new Date(`${workDate}T${workEndTime}:00`).toISOString() : null;
    const r = await addManualWorkDoneAction({
      task_id: task.id,
      work_date: workDate,
      duration_minutes: mins,
      note: workDesc || null,
      started_at: startedAt,
      ended_at: endedAt,
    });
    setLoggingWork(false);
    if (!r.success) { toast.error(r.error); return; }
    toast.success(`Logged ${mins}m`);
    setWorkMinutes('');
    setWorkDesc('');
    setWorkStartTime('');
    setWorkEndTime('');
    setShowWorkLog(false);
    router.refresh();
    onRefresh?.();
  }

  async function removeWorkEntry(id: string) {
    const ok = await confirm({ title: 'Delete Entry', description: 'Delete this time entry?' });
    if (!ok) return;
    startWorkTransition(async () => {
      const r = await deleteWorkDoneAction(id);
      if (!r.success) { toast.error(r.error); return; }
      toast.success('Entry deleted');
      router.refresh();
      onRefresh?.();
    });
  }

  return {
    task,
    activity,
    notes,
    team,
    steps,
    cfDefs,
    cfValues,
    allLabels,
    assignedLabels,
    workdone,
    subServices,
    taskTemplates,
    currentUserId,
    canEdit,
    canEditSteps,
    canDelete,
    isAdmin,
    canAssign,
    clientGstFrequency,
    basePath,
    clientPath,
    isModal,
    onRefresh,
    router,
    isClosed,
    editMode,
    editing,
    setEditing,
    saving,
    setSaving,
    newNote,
    setNewNote,
    addingNote,
    setAddingNote,
    descExpanded,
    setDescExpanded,
    showStuckPicker,
    setShowStuckPicker,
    stuckReason,
    setStuckReason,
    isPending,
    startTransition,
    showWorkLog,
    setShowWorkLog,
    workMinutes,
    setWorkMinutes,
    workDesc,
    setWorkDesc,
    workStartTime,
    setWorkStartTime,
    workEndTime,
    setWorkEndTime,
    loggingWork,
    setLoggingWork,
    workPending,
    startWorkTransition,
    ConfirmDialog,
    confirm,
    addNote,
    saveField,
    handleTransition,
    transitioning,
    handleBlockedToggle,
    handleMarkStuck,
    handleUnstuck,
    submitWorkLog,
    removeWorkEntry,
  };
}

export type TaskDetailCtx = ReturnType<typeof useTaskDetail>;
