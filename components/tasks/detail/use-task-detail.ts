'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateTaskAction, addTaskNoteAction, transitionTaskAction } from '@/lib/actions/tasks';
import { addManualWorkDoneAction, deleteWorkDoneAction } from '@/lib/actions/workdone';
import { setTaskBlockedOnClientAction, setTaskStuckAction } from '@/lib/actions/task-flags';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/use-confirm';
import type { Props } from './types';

/** All state and handlers for the task detail view; both layouts read from this one object. */
export function useTaskDetail(props: Props) {
  const {
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
    basePath,
    clientPath,
    isModal,
    onRefresh,
  } = props;
  const router = useRouter();
  const isClosed = task.status === 'completed' || task.status === 'cancelled';
  const [editingDesc, setEditingDesc] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [editingAssignee, setEditingAssignee] = useState(false);
  const [editingBilling, setEditingBilling] = useState(false);
  const [editingArn, setEditingArn] = useState(false);
  const [editingFinance, setEditingFinance] = useState(false);
  const [editingService, setEditingService] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [selectedSubServiceId, setSelectedSubServiceId] = useState(task.sub_service_id || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState(task.task_template_id || '');

  // Resync local edit state when the task data refreshes (e.g. after a successful save).
  useEffect(() => {
    setSelectedSubServiceId(task.sub_service_id || '');
    setSelectedTemplateId(task.task_template_id || '');
  }, [task.id, task.sub_service_id, task.task_template_id]);
  const [description, setDescription] = useState(task.description || '');
  const [periodYear, setPeriodYear] = useState<string>(String(task.period_year ?? ''));
  const [periodMonth, setPeriodMonth] = useState<string>(String(task.period_month ?? ''));
  const [periodQuarter, setPeriodQuarter] = useState<string>(String(task.period_quarter ?? ''));
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState<string>(task.due_date ? task.due_date.slice(0, 10) : '');
  const [assignedTo, setAssignedTo] = useState<string>(task.assigned_to || '');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assignees?.map((a) => a.id) ?? (task.assigned_to ? [task.assigned_to] : []));
  const [reviewerIds, setReviewerIds] = useState<string[]>(task.reviewers?.map((r) => r.id) ?? (task.reviewer_id ? [task.reviewer_id] : []));
  
  const [billable, setBillable] = useState(task.is_billable ?? false);
  const [billRef, setBillRef] = useState<string>(task.bill_reference ?? '');
  const [billAmount, setBillAmount] = useState<string>(String(task.bill_amount ?? ''));
  const [arnRef, setArnRef] = useState<string>(task.arn_reference ?? '');
  const [arnVisible, setArnVisible] = useState(task.is_arn_client_visible ?? false);

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

  function handleTransition(toStatus: import('@/lib/validation/schemas').TaskStatus) {
    startTransition(async () => {
      const r = await transitionTaskAction({ task_id: task.id, to_status: toStatus as import('@/lib/validation/schemas').TaskStatus });
      if (!r.success) toast.error(r.error);
      else {
        toast.success(`Moved to ${toStatus.replace('_', ' ')}`);
        router.refresh();
        onRefresh?.();
      }
    });
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
    basePath,
    clientPath,
    isModal,
    onRefresh,
    router,
    isClosed,
    editingDesc,
    setEditingDesc,
    editingPeriod,
    setEditingPeriod,
    editingPriority,
    setEditingPriority,
    editingDueDate,
    setEditingDueDate,
    editingAssignee,
    setEditingAssignee,
    editingBilling,
    setEditingBilling,
    editingArn,
    setEditingArn,
    editingFinance,
    setEditingFinance,
    editingService,
    setEditingService,
    editingTemplate,
    setEditingTemplate,
    selectedSubServiceId,
    setSelectedSubServiceId,
    selectedTemplateId,
    setSelectedTemplateId,
    description,
    setDescription,
    periodYear,
    setPeriodYear,
    periodMonth,
    setPeriodMonth,
    periodQuarter,
    setPeriodQuarter,
    priority,
    setPriority,
    dueDate,
    setDueDate,
    assignedTo,
    setAssignedTo,
    assigneeIds,
    setAssigneeIds,
    reviewerIds,
    setReviewerIds,
    billable,
    setBillable,
    billRef,
    setBillRef,
    billAmount,
    setBillAmount,
    arnRef,
    setArnRef,
    arnVisible,
    setArnVisible,
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
    handleBlockedToggle,
    handleMarkStuck,
    handleUnstuck,
    submitWorkLog,
    removeWorkEntry,
  };
}

export type TaskDetailCtx = ReturnType<typeof useTaskDetail>;
