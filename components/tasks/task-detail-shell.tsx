'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DockLink } from '@/components/shell/dock-link';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Pencil, Check, X, Loader2, ArrowRight, Plus, Clock, Trash2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatDateIST, formatTimeIST, timeAgo, cn } from '@/lib/utils';
import TaskActions from '@/app/team/tasks/[id]/task-actions';
import TaskStepsPanel from '@/components/tasks/task-steps-panel';
import SendReminderButton from '@/components/tasks/send-reminder-button';
import StuckToggle from '@/components/tasks/stuck-toggle';
import BlockedOnClientToggle from '@/components/tasks/blocked-on-client-toggle';
import CustomFieldsPanel from '@/components/tasks/custom-fields-panel';
import WorkDonePanel from '@/components/tasks/workdone-panel';
import DeleteTaskButton from '@/components/tasks/delete-task-button';
import VerifyTaskButton from '@/components/tasks/verify-task-button';
import { updateTaskAction, addTaskNoteAction, transitionTaskAction, assignTaskAction } from '@/lib/actions/tasks';
import { addManualWorkDoneAction, deleteWorkDoneAction } from '@/lib/actions/workdone';
import { setTaskBlockedOnClientAction, setTaskStuckAction } from '@/lib/actions/task-flags';
import { nextStatuses } from '@/lib/services/task-transitions';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/use-confirm';

interface Props {
  task: any;
  activity: any[];
  notes: any[];
  team: any[];
  steps: any[];
  cfDefs: any[];
  cfValues: any[];
  allLabels: any[];
  assignedLabels: any[];
  workdone: any[];
  subServices: any[];
  taskTemplates: any[];
  currentUserId: string;
  canEdit: boolean;
  canEditSteps: boolean;
  canDelete: boolean;
  basePath: string;
  clientPath: string;
  isModal?: boolean;
  onRefresh?: () => void;
}

export default function TaskDetailShell({
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
}: Props) {
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
  const [periodYear, setPeriodYear] = useState(task.period_year ?? '');
  const [periodMonth, setPeriodMonth] = useState(task.period_month ?? '');
  const [periodQuarter, setPeriodQuarter] = useState(task.period_quarter ?? '');
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 10) : '');
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  const [assigneeIds, setAssigneeIds] = useState<string[]>((task as any).assignees?.map((a: any) => a.id) ?? (task.assigned_to ? [task.assigned_to] : []));
  const [reviewerIds, setReviewerIds] = useState<string[]>((task as any).reviewers?.map((r: any) => r.id) ?? (task.reviewer_id ? [task.reviewer_id] : []));
  
  const [billable, setBillable] = useState(task.is_billable ?? false);
  const [billRef, setBillRef] = useState(task.bill_reference ?? '');
  const [billAmount, setBillAmount] = useState(task.bill_amount ?? '');
  const [arnRef, setArnRef] = useState(task.arn_reference ?? '');
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

  async function saveField(updates: any, onSuccess?: () => void) {
    setSaving(true);
    const r = await updateTaskAction({ task_id: task.id, ...updates });
    setSaving(false);
    if (!r.success) { toast.error(r.error); return false; }
    toast.success('Updated');
    onSuccess?.();
    onRefresh?.();
    return true;
  }

  function handleTransition(toStatus: string) {
    startTransition(async () => {
      const r = await transitionTaskAction({ task_id: task.id, to_status: toStatus as any });
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
      const r = await setTaskStuckAction({ task_id: task.id, is_stuck: true, reason_code: stuckReason as any, reason_note: null });
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

  return (
    <div className={`flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 ${isModal ? 'h-full' : 'h-[calc(100vh-6.5rem)]'}`}>
      <ConfirmDialog />
      {!isModal && (
        <div className="flex-none mb-4 md:hidden">
          <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 font-medium">
            <ChevronLeft className="h-4 w-4" /> Back to Tasks
          </Link>
        </div>
      )}

      {isModal ? (
        <div className="flex-1 min-h-0 flex flex-col gap-4 pb-6 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {/* Title + Status + Client */}
          <div className="tff-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono text-zinc-400">{task.task_number ?? '—'}</span>
              {task.is_billable && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                  Billable
                </span>
              )}
            </div>
            <h1 className="text-base font-semibold text-zinc-900 leading-tight mb-2">
              {task.sub_services ? `${task.sub_services.name} — ${task.clients?.business_name ?? ''}` : task.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'teal' : 'warning'}>
                {task.status.replace('_', ' ')}
              </Badge>
              {task.is_verified && (
                <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">Verified</Badge>
              )}
              <DockLink item={{ type: 'client', id: task.client_id }} href={clientPath} className="text-xs text-zinc-500 hover:text-teal-700 hover:underline font-medium">
                {task.clients?.business_name}
              </DockLink>
            </div>
          </div>

          {/* Editable Metadata Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Priority */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Priority</div>
                {canEdit && !isClosed && !editingPriority && (
                  <button type="button" onClick={() => setEditingPriority(true)} className="text-zinc-400 hover:text-zinc-600"><Pencil className="h-3 w-3" /></button>
                )}
              </div>
              {editingPriority ? (
                <div className="flex items-center gap-1">
                  <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                    <SelectTrigger className="h-7 text-xs w-24 px-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => { if (await saveField({ priority })) setEditingPriority(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setPriority(task.priority); setEditingPriority(false); }}><X className="h-3 w-3 text-zinc-400" /></Button>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900 capitalize">{task.priority}</div>
              )}
            </div>

            {/* Due date */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Due date</div>
                {canEdit && !isClosed && !editingDueDate && (
                  <button type="button" onClick={() => setEditingDueDate(true)} className="text-zinc-400 hover:text-zinc-600"><Pencil className="h-3 w-3" /></button>
                )}
              </div>
              {editingDueDate ? (
                <div className="flex items-center gap-1">
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-7 text-[10px] w-28 px-1" />
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => { if (await saveField({ due_date: dueDate || null })) setEditingDueDate(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setDueDate(task.due_date ? task.due_date.slice(0, 10) : ''); setEditingDueDate(false); }}><X className="h-3 w-3 text-zinc-400" /></Button>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">{task.due_date ? formatDateIST(task.due_date) : '—'}</div>
              )}
            </div>

            {/* Period */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Period</div>
                {canEdit && !isClosed && !editingPeriod && (
                  <button type="button" onClick={() => setEditingPeriod(true)} className="text-zinc-400 hover:text-zinc-600"><Pencil className="h-3 w-3" /></button>
                )}
              </div>
              {editingPeriod ? (
                <div className="flex items-center gap-1">
                  <Input type="number" value={periodYear} onChange={(e) => setPeriodYear(e.target.value)} className="w-14 h-6 text-[10px] px-1" placeholder="YYYY" />
                  <Input type="number" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} className="w-10 h-6 text-[10px] px-1" placeholder="MM" />
                  <Input type="number" value={periodQuarter} onChange={(e) => setPeriodQuarter(e.target.value)} className="w-10 h-6 text-[10px] px-1" placeholder="Q" />
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => { if (await saveField({ period_year: periodYear ? parseInt(periodYear) : null, period_month: periodMonth ? parseInt(periodMonth) : null, period_quarter: periodQuarter ? parseInt(periodQuarter) : null })) setEditingPeriod(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setPeriodYear(task.period_year ?? ''); setPeriodMonth(task.period_month ?? ''); setPeriodQuarter(task.period_quarter ?? ''); setEditingPeriod(false); }}><X className="h-3 w-3 text-zinc-400" /></Button>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">{task.period_month && task.period_year ? `${task.period_month}/${task.period_year}${task.period_quarter ? ` · Q${task.period_quarter}` : ''}` : '—'}</div>
              )}
            </div>

            {/* Assignees */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Assignees</div>
                {!isClosed && !editingAssignee && (
                  <button type="button" onClick={() => setEditingAssignee(true)} className="text-zinc-400 hover:text-zinc-600"><Pencil className="h-3 w-3" /></button>
                )}
              </div>
              {editingAssignee ? (
                <div className="space-y-2">
                  <MultiSelect
                    options={team.map((u: any) => ({ value: u.id, label: u.full_name, searchString: u.full_name.toLowerCase() }))}
                    value={assigneeIds}
                    onChange={setAssigneeIds}
                    placeholder="Select assignees"
                    searchPlaceholder="Search team..."
                  />
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Reviewers</div>
                  <MultiSelect
                    options={team.map((u: any) => ({ value: u.id, label: u.full_name, searchString: u.full_name.toLowerCase() }))}
                    value={reviewerIds}
                    onChange={setReviewerIds}
                    placeholder="Select reviewers"
                    searchPlaceholder="Search team..."
                  />
                  <div className="flex items-center gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => {
                      setSaving(true);
                      const r = await assignTaskAction({ task_id: task.id, assigned_to: assigneeIds, reviewer_id: reviewerIds });
                      setSaving(false);
                      if (!r.success) { toast.error(r.error); return; }
                      toast.success('Assignment updated');
                      setEditingAssignee(false);
                      onRefresh?.();
                    }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                      setAssigneeIds((task as any).assignees?.map((a: any) => a.id) ?? (task.assigned_to ? [task.assigned_to] : []));
                      setReviewerIds((task as any).reviewers?.map((r: any) => r.id) ?? (task.reviewer_id ? [task.reviewer_id] : []));
                      setEditingAssignee(false);
                    }}><X className="h-3 w-3 text-zinc-400" /></Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">
                  {((task as any).assignees?.length ? (task as any).assignees : task.assignee ? [task.assignee] : []).map((a: any) => a.full_name).join(', ') || '—'}
                </div>
              )}
            </div>

            {/* Billing */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Billing</div>
                {canEdit && !isClosed && !editingBilling && (
                  <button type="button" onClick={() => setEditingBilling(true)} className="text-zinc-400 hover:text-zinc-600"><Pencil className="h-3 w-3" /></button>
                )}
              </div>
              {editingBilling ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Billable</span>
                    <Switch checked={billable} onCheckedChange={setBillable} />
                  </div>
                  {billable && (
                    <div className="space-y-1">
                      <Input value={billRef} onChange={(e) => setBillRef(e.target.value)} placeholder="Ref" className="h-6 text-[10px]" />
                      <Input type="number" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="Amount" className="h-6 text-[10px]" />
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => {
                      const numAmount = parseFloat(billAmount as string);
                      if (await saveField({ is_billable: billable, bill_reference: billRef || null, bill_amount: isNaN(numAmount) ? null : numAmount })) setEditingBilling(false);
                    }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                      setBillable(task.is_billable ?? false);
                      setBillRef(task.bill_reference ?? '');
                      setBillAmount(task.bill_amount ?? '');
                      setEditingBilling(false);
                    }}><X className="h-3 w-3 text-zinc-400" /></Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">{task.is_billable ? `Yes · ${task.bill_reference || 'No ref'} · ₹${task.bill_amount ?? 0}` : 'No'}</div>
              )}
            </div>

            {/* ARN */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">ARN</div>
                {canEdit && !isClosed && !editingArn && (
                  <button type="button" onClick={() => setEditingArn(true)} className="text-zinc-400 hover:text-zinc-600"><Pencil className="h-3 w-3" /></button>
                )}
              </div>
              {editingArn ? (
                <div className="space-y-2">
                  <Input value={arnRef} onChange={(e) => setArnRef(e.target.value)} placeholder="ARN reference" className="h-6 text-[10px]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Client visible</span>
                    <Switch checked={arnVisible} onCheckedChange={setArnVisible} />
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => {
                      if (await saveField({ arn_reference: arnRef || null, is_arn_client_visible: arnVisible })) setEditingArn(false);
                    }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                      setArnRef(task.arn_reference ?? '');
                      setArnVisible(task.is_arn_client_visible ?? false);
                      setEditingArn(false);
                    }}><X className="h-3 w-3 text-zinc-400" /></Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">{task.arn_reference || '—'}</div>
              )}
            </div>

            {/* Service */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Service</div>
                {canEdit && !isClosed && !editingService && (
                  <button type="button" onClick={() => setEditingService(true)} className="text-zinc-400 hover:text-zinc-600 opacity-70 hover:opacity-100 transition-opacity" title="Edit service"><Pencil className="h-3 w-3" /></button>
                )}
              </div>
              {editingService ? (
                <div className="space-y-2">
                  <Select value={selectedSubServiceId} onValueChange={(v) => { setSelectedSubServiceId(v); setSelectedTemplateId(''); }}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select service" /></SelectTrigger>
                    <SelectContent>
                      {subServices.map((s: any) => (
                        <SelectItem key={s.sub_service_id} value={s.sub_service_id} className="text-xs">
                          {s.sub_services?.services?.name ? `${s.sub_services.services.name} › ` : ''}{s.sub_services?.name || s.sub_service_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (await saveField({ sub_service_id: selectedSubServiceId || null, task_template_id: null })) setEditingService(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedSubServiceId(task.sub_service_id || ''); setSelectedTemplateId(task.task_template_id || ''); setEditingService(false); }}><X className="h-3 w-3 text-zinc-400" /></Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">{task.sub_services ? `${task.sub_services.services?.name ?? ''} › ${task.sub_services.name}` : '—'}</div>
              )}
            </div>

            {/* Template */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Template</div>
                {canEdit && !isClosed && !editingTemplate && (
                  <button type="button" onClick={() => setEditingTemplate(true)} className="text-zinc-400 hover:text-zinc-600 opacity-70 hover:opacity-100 transition-opacity" title="Edit template"><Pencil className="h-3 w-3" /></button>
                )}
              </div>
              {editingTemplate ? (
                <div className="space-y-2">
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select template" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">None</SelectItem>
                      {(() => {
                        const availableTemplates = taskTemplates.filter((t: any) => t.sub_service_id === (selectedSubServiceId || task.sub_service_id));
                        if (availableTemplates.length === 0) {
                          return <SelectItem value="__empty__" disabled className="text-xs text-zinc-400">No templates for this sub-service</SelectItem>;
                        }
                        return availableTemplates.map((t: any) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">{t.title}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); const taskTemplateId = selectedTemplateId && selectedTemplateId !== '__empty__' ? selectedTemplateId : null; if (await saveField({ task_template_id: taskTemplateId })) setEditingTemplate(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedTemplateId(task.task_template_id || ''); setEditingTemplate(false); }}><X className="h-3 w-3 text-zinc-400" /></Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">{taskTemplates.find((t: any) => t.id === task.task_template_id)?.title || (canEdit && !isClosed ? <span className="text-zinc-400 font-normal">No template — click to set</span> : '—')}</div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {steps.length > 0 && (
            <div className="tff-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-semibold text-zinc-700">Progress</h3>
                <span className="text-[11px] text-zinc-500">
                  {steps.filter((s: any) => s.completed_at).length} of {steps.length} completed
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div 
                  className="h-full bg-teal-600 transition-all rounded-full" 
                  style={{ width: `${steps.length === 0 ? 0 : Math.round((steps.filter((s: any) => s.completed_at).length / steps.length) * 100)}%` }} 
                />
              </div>
            </div>
          )}

          {/* Steps — always visible */}
          {steps.length > 0 && (
            <div className="tff-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[13px] font-semibold text-zinc-700">Checklist — tick off as you complete</h3>
                <span className="text-[11px] text-zinc-500">
                  {steps.filter((s: any) => s.completed_at).length} of {steps.length}
                </span>
              </div>
              <TaskStepsPanel taskId={task.id} initial={steps} editable={canEditSteps} allowAddStep={canEditSteps} enforceSequence status={task.status} currentUserName={team.find(u => u.id === currentUserId)?.full_name ?? 'You'} />
            </div>
          )}

          {/* Description */}
          <div className="tff-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-zinc-700">Description</h3>
              {canEdit && !isClosed && !editingDesc && (
                <button type="button" onClick={() => setEditingDesc(true)} className="text-zinc-400 hover:text-zinc-600"><Pencil className="h-3 w-3" /></button>
              )}
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} autoFocus className="text-sm" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={async () => { if (await saveField({ description: description || null })) setEditingDesc(false); }} disabled={saving}>Save</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setDescription(task.description || ''); setEditingDesc(false); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <p className={cn('text-xs text-zinc-600 whitespace-pre-wrap leading-relaxed', !descExpanded && 'line-clamp-3')}>
                  {task.description || <span className="text-zinc-400 italic">No description provided.</span>}
                </p>
                {task.description && task.description.length > 120 && (
                  <button type="button" onClick={() => setDescExpanded(!descExpanded)} className="mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium">
                    {descExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Labels */}
          <CustomFieldsPanel taskId={task.id} definitions={cfDefs} values={cfValues} allLabels={allLabels} assignedLabels={assignedLabels} readonly={isClosed} />

          {/* Work logging */}
          <div className="tff-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-zinc-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-teal-600" /> Work log
              </h3>
              {!showWorkLog && !isClosed && (
                <Button type="button" size="sm" variant="outline" onClick={() => setShowWorkLog(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Log work
                </Button>
              )}
            </div>
            {showWorkLog && (
              <div className="rounded-lg border border-zinc-100 bg-white p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input type="number" min={1} max={1440} value={workMinutes} onChange={(e) => setWorkMinutes(e.target.value)} placeholder="Minutes" className="w-24 h-8 text-xs" />
                  <Input type="time" value={workStartTime} onChange={(e) => setWorkStartTime(e.target.value)} className="w-24 h-8 text-xs" />
                  <Input type="time" value={workEndTime} onChange={(e) => setWorkEndTime(e.target.value)} className="w-24 h-8 text-xs" />
                  <Input value={workDesc} onChange={(e) => setWorkDesc(e.target.value)} placeholder="What did you work on? (optional)" className="flex-1 h-8 text-xs" />
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={submitWorkLog} disabled={loggingWork || !workMinutes}>Log entry</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setShowWorkLog(false); setWorkMinutes(''); setWorkDesc(''); setWorkStartTime(''); setWorkEndTime(''); }}>Cancel</Button>
                </div>
              </div>
            )}
            {workdone.length > 0 && (
              <ul className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {workdone.slice(0, 10).map((e: any) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium tabular-nums text-xs">{fmtHM(e.duration_minutes)}</span>
                      <span className="text-zinc-400 mx-1">·</span>
                      <span className="text-zinc-600 text-xs">{e.users_profile?.full_name ?? 'You'}</span>
                      <span className="text-zinc-400 mx-1">·</span>
                      {e.started_at && e.ended_at ? (
                        <span className="text-zinc-500 text-[11px]">{formatTimeIST(e.started_at)} – {formatTimeIST(e.ended_at)}</span>
                      ) : (
                        <span className="text-zinc-500 text-[11px]">{formatDateIST(e.work_date)}</span>
                      )}
                      {e.note && <div className="text-xs text-zinc-500 truncate">{e.note}</div>}
                    </div>
                    {e.user_id === currentUserId && (
                      <button type="button" onClick={() => removeWorkEntry(e.id)} disabled={workPending} className="text-zinc-400 hover:text-red-600 p-1" aria-label="Delete entry">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Notes - last 2 only */}
          <div className="tff-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-zinc-700">Notes</h3>
              {notes.length > 2 && (
                <span className="text-[11px] text-zinc-500">{notes.length} total</span>
              )}
            </div>
            <div className="border border-zinc-200 rounded-xl p-3 bg-zinc-50 space-y-3 mb-3">
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add an internal note…" rows={2} className="border-0 focus-visible:ring-0 p-0 text-sm resize-none bg-transparent" />
              <div className="flex justify-end pt-2 border-t border-zinc-200/50">
                <Button type="button" size="sm" onClick={addNote} disabled={addingNote || !newNote.trim()} className="h-7 text-xs">
                  {addingNote ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Save
                </Button>
              </div>
            </div>
            {notes.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No notes yet.</p>
            ) : (
              <div className="space-y-2">
                {notes.slice(-2).map((n: any) => (
                  <div key={n.id} className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex justify-between">
                      <span>{n.users_profile?.full_name}</span>
                      <span>{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap line-clamp-3">{n.note_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {!isClosed && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {nextStatuses(task.status).includes('in_progress') && (
                  <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => handleTransition('in_progress')} disabled={isPending}>
                    Start
                  </Button>
                )}
                {nextStatuses(task.status).includes('completed') && (
                  <Button type="button" size="sm" variant="outline" className="flex-1 border-teal-200 text-teal-700 hover:bg-teal-50" onClick={() => handleTransition('completed')} disabled={isPending}>
                    Complete
                  </Button>
                )}
                {task.status !== 'pending' && (
                  <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => handleTransition('pending')} disabled={isPending}>
                    Move to pending
                  </Button>
                )}
                <Button type="button" size="sm" variant={task.is_blocked_on_client ? 'default' : 'outline'} className="flex-1" onClick={handleBlockedToggle} disabled={isPending}>
                  {task.is_blocked_on_client ? 'Unblock' : 'Blocked'}
                </Button>
                {task.is_stuck ? (
                  <Button type="button" size="sm" variant="default" className="flex-1" onClick={handleUnstuck} disabled={isPending}>
                    Unstuck
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setShowStuckPicker(true)} disabled={isPending}>
                    Stuck
                  </Button>
                )}
              </div>
              {showStuckPicker && (
                <div className="rounded-lg border border-zinc-200 p-3 space-y-2 bg-zinc-50">
                  <Select value={stuckReason} onValueChange={setStuckReason}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_clarification">Awaiting client clarification</SelectItem>
                      <SelectItem value="gst_portal_down">GST portal unavailable</SelectItem>
                      <SelectItem value="itd_portal_down">Income Tax portal unavailable</SelectItem>
                      <SelectItem value="mcadown">MCA portal unavailable</SelectItem>
                      <SelectItem value="mismatch_investigation">Reconciliation mismatch under investigation</SelectItem>
                      <SelectItem value="awaiting_third_party">Awaiting bank / vendor / counterparty</SelectItem>
                      <SelectItem value="awaiting_management">Awaiting client management response</SelectItem>
                      <SelectItem value="dsc_issue">DSC unavailable / expired</SelectItem>
                      <SelectItem value="payment_pending">Tax/fee payment pending from client</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" className="h-7 text-xs" onClick={handleMarkStuck} disabled={isPending || !stuckReason}>Mark stuck</Button>
                    <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowStuckPicker(false); setStuckReason(''); }} disabled={isPending}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
          
          {/* LEFT COLUMN: Context & Identity */}
          <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-zinc-400">{task.task_number ?? '—'}</span>
                {task.is_billable && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                    Billable{task.bill_reference ? ` · ${task.bill_reference}` : ''}
                  </span>
                )}
              </div>

              <div>
                <h1 className="tff-page-title leading-tight">
                  {task.sub_services ? task.sub_services.name : task.title}
                </h1>
                <p className="text-sm text-zinc-500 mt-1">
                  {task.clients?.business_name ?? ''}
                  {task.period_year ? ` · ${task.period_month ? new Date(task.period_year, task.period_month - 1).toLocaleString('default', { month: 'short' }) + ' ' : task.period_quarter ? 'Q' + task.period_quarter + ' ' : ''}${task.period_year}` : ''}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'teal' : 'warning'}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                  {task.is_verified && (
                    <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">Verified</Badge>
                  )}
                  <DockLink item={{ type: 'client', id: task.client_id }} href={clientPath} className="text-sm text-zinc-500 hover:text-teal-700 hover:underline font-medium">
                    {task.clients?.business_name}
                  </DockLink>
                </div>
              </div>
              

            </div>

            <div className="tff-card p-5">
              <h3 className="font-semibold mb-3 text-zinc-900 tracking-tight text-sm">Key Details</h3>
              <dl className="space-y-2 text-sm">
                
                <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
                  <dt className="text-zinc-500 text-xs flex items-center gap-1">Period {canEdit && !isClosed && <Button type="button" size="sm" variant="ghost" className="h-4 w-4 p-0 ml-1" onClick={() => setEditingPeriod(true)}><Pencil className="h-3 w-3 text-zinc-400" /></Button>}</dt>
                  <dd className="font-semibold text-zinc-900">
                    {editingPeriod ? (
                      <div className="flex items-center gap-1">
                        <Input type="number" value={periodYear} onChange={(e) => setPeriodYear(e.target.value)} className="w-14 h-6 text-[10px] px-1" placeholder="YYYY" />
                        <Input type="number" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} className="w-10 h-6 text-[10px] px-1" placeholder="MM" />
                        <Input type="number" value={periodQuarter} onChange={(e) => setPeriodQuarter(e.target.value)} className="w-10 h-6 text-[10px] px-1" placeholder="Q" />
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => { if (await saveField({ period_year: periodYear ? parseInt(periodYear) : null, period_month: periodMonth ? parseInt(periodMonth) : null, period_quarter: periodQuarter ? parseInt(periodQuarter) : null })) setEditingPeriod(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setPeriodYear(task.period_year ?? ''); setPeriodMonth(task.period_month ?? ''); setPeriodQuarter(task.period_quarter ?? ''); setEditingPeriod(false); }}><X className="h-3 w-3 text-zinc-400" /></Button>
                      </div>
                    ) : (
                      task.period_month && task.period_year ? `${task.period_month}/${task.period_year}${task.period_quarter ? ` · Q${task.period_quarter}` : ''}` : '—'
                    )}
                  </dd>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
                  <dt className="text-zinc-500 text-xs flex items-center gap-1">Priority {canEdit && !isClosed && <Button type="button" size="sm" variant="ghost" className="h-4 w-4 p-0 ml-1" onClick={() => setEditingPriority(true)}><Pencil className="h-3 w-3 text-zinc-400" /></Button>}</dt>
                  <dd className="font-semibold text-zinc-900">
                    {editingPriority ? (
                      <div className="flex items-center gap-1">
                        <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                          <SelectTrigger className="h-6 text-[10px] w-20 px-1"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                        </Select>
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => { if (await saveField({ priority })) setEditingPriority(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setPriority(task.priority); setEditingPriority(false); }}><X className="h-3 w-3 text-zinc-400" /></Button>
                      </div>
                    ) : (
                      <span className="capitalize">{task.priority}</span>
                    )}
                  </dd>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
                  <dt className="text-zinc-500 text-xs flex items-center gap-1">Due Date {canEdit && !isClosed && <Button type="button" size="sm" variant="ghost" className="h-4 w-4 p-0 ml-1" onClick={() => setEditingDueDate(true)}><Pencil className="h-3 w-3 text-zinc-400" /></Button>}</dt>
                  <dd className="font-semibold text-zinc-900">
                    {editingDueDate ? (
                      <div className="flex items-center gap-1">
                        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-6 text-[10px] w-28 px-1" />
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => { if (await saveField({ due_date: dueDate || null })) setEditingDueDate(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setDueDate(task.due_date ? task.due_date.slice(0, 10) : ''); setEditingDueDate(false); }}><X className="h-3 w-3 text-zinc-400" /></Button>
                      </div>
                    ) : (
                      task.due_date ? formatDateIST(task.due_date) : '—'
                    )}
                  </dd>
                </div>

                <DetailItem label="Assignees" value={((task as any).assignees?.length ? (task as any).assignees : task.assignee ? [task.assignee] : []).map((a: any) => a.full_name).join(', ') || '—'} />
                <DetailItem label="Reviewers" value={((task as any).reviewers?.length ? (task as any).reviewers : task.reviewer ? [task.reviewer] : []).map((r: any) => r.full_name).join(', ') || '—'} />
                <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
                  <dt className="text-zinc-500 text-xs flex items-center gap-1">Service {canEdit && !isClosed && <Button type="button" size="sm" variant="ghost" className="h-4 w-4 p-0 ml-1" onClick={() => setEditingService(true)}><Pencil className="h-3 w-3 text-zinc-400" /></Button>}</dt>
                  <dd className="font-semibold text-zinc-900 text-right">
                    {editingService ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Select value={selectedSubServiceId} onValueChange={(v) => { setSelectedSubServiceId(v); setSelectedTemplateId(''); }}>
                          <SelectTrigger className="h-6 text-[10px] w-44 px-1"><SelectValue placeholder="Select service" /></SelectTrigger>
                          <SelectContent>
                            {subServices.map((s: any) => (
                              <SelectItem key={s.sub_service_id} value={s.sub_service_id} className="text-xs">
                                {s.sub_services?.services?.name ? `${s.sub_services.services.name} › ` : ''}{s.sub_services?.name || s.sub_service_id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (await saveField({ sub_service_id: selectedSubServiceId || null, task_template_id: null })) setEditingService(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedSubServiceId(task.sub_service_id || ''); setSelectedTemplateId(task.task_template_id || ''); setEditingService(false); }}><X className="h-3 w-3 text-zinc-400" /></Button>
                      </div>
                    ) : (
                      task.sub_services ? `${task.sub_services.services?.name ?? ''} › ${task.sub_services.name}` : '—'
                    )}
                  </dd>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
                  <dt className="text-zinc-500 text-xs flex items-center gap-1">Template {canEdit && !isClosed && <Button type="button" size="sm" variant="ghost" className="h-4 w-4 p-0 ml-1" onClick={() => setEditingTemplate(true)}><Pencil className="h-3 w-3 text-zinc-400" /></Button>}</dt>
                  <dd className="font-semibold text-zinc-900 text-right">
                    {editingTemplate ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                          <SelectTrigger className="h-6 text-[10px] w-44 px-1"><SelectValue placeholder="Select template" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="" className="text-xs">None</SelectItem>
                            {(() => {
                              const availableTemplates = taskTemplates.filter((t: any) => t.sub_service_id === (selectedSubServiceId || task.sub_service_id));
                              if (availableTemplates.length === 0) {
                                return <SelectItem value="__empty__" disabled className="text-xs text-zinc-400">No templates for this sub-service</SelectItem>;
                              }
                              return availableTemplates.map((t: any) => (
                                <SelectItem key={t.id} value={t.id} className="text-xs">{t.title}</SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); const taskTemplateId = selectedTemplateId && selectedTemplateId !== '__empty__' ? selectedTemplateId : null; if (await saveField({ task_template_id: taskTemplateId })) setEditingTemplate(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedTemplateId(task.task_template_id || ''); setEditingTemplate(false); }}><X className="h-3 w-3 text-zinc-400" /></Button>
                      </div>
                    ) : (
                      taskTemplates.find((t: any) => t.id === task.task_template_id)?.title || (canEdit && !isClosed ? <span className="text-zinc-400 font-normal">No template — click to set</span> : '—')
                    )}
                  </dd>
                </div>

                <DetailItem label="Created" value={formatDateIST(task.created_date) || '—'} />
                <DetailItem label="Completed" value={formatDateIST(task.completed_date) || 'Not completed'} />

              </dl>
            </div>

            {/* Description moved to center column */}

            <div className="tff-card p-5 relative group">
              <h3 className="font-semibold mb-3 text-zinc-900 tracking-tight text-sm">Finance & Ref</h3>
              {canEdit && !isClosed && !editingFinance && (
                <Button type="button" size="sm" variant="ghost" className="absolute top-4 right-4 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingFinance(true)}>
                  <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                </Button>
              )}
              {editingFinance ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="space-y-1 flex items-center justify-between">
                      <Label className="text-xs text-zinc-500">Billable</Label>
                      <Switch checked={billable} onCheckedChange={setBillable} />
                    </div>
                    {billable && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">Bill reference</Label>
                          <Input value={billRef} onChange={(e) => setBillRef(e.target.value)} placeholder="e.g. INV-2026-01" className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">Bill amount (₹)</Label>
                          <Input type="number" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="0.00" className="h-7 text-xs" />
                        </div>
                      </>
                    )}
                    <div className="space-y-1 mt-2">
                      <Label className="text-xs text-zinc-500">ARN / Ref</Label>
                      <Input value={arnRef} onChange={(e) => setArnRef(e.target.value)} placeholder="e.g. ARN12345678" className="h-7 text-xs" />
                    </div>
                    <div className="space-y-1 flex items-center justify-between">
                      <Label className="text-xs text-zinc-500">ARN client visible</Label>
                      <Switch checked={arnVisible} onCheckedChange={setArnVisible} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                    <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={async () => {
                      const numAmount = parseFloat(billAmount as string);
                      const ok = await saveField({ 
                        is_billable: billable, 
                        bill_reference: billRef || null, 
                        bill_amount: isNaN(numAmount) ? null : numAmount,
                        arn_reference: arnRef || null, 
                        is_arn_client_visible: arnVisible 
                      });
                      if (ok) setEditingFinance(false);
                    }} disabled={saving}>Save</Button>
                    <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => {
                      setBillable(task.is_billable ?? false);
                      setBillRef(task.bill_reference ?? '');
                      setBillAmount(task.bill_amount ?? '');
                      setArnRef(task.arn_reference ?? '');
                      setArnVisible(task.is_arn_client_visible ?? false);
                      setEditingFinance(false);
                    }} disabled={saving}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-zinc-500 text-xs">Billing</span>
                    <p className="font-medium text-zinc-900">{task.is_billable ? `Yes · ${task.bill_reference || 'No ref'} · ₹${task.bill_amount ?? 0}` : 'No'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs">ARN / Ref</span>
                    <p className="font-medium text-zinc-900">{task.arn_reference || '—'}</p>
                  </div>
                  {task.arn_reference && (
                    <div>
                      <span className="text-zinc-500 text-xs">Client visible</span>
                      <p className="font-medium text-zinc-900">{task.is_arn_client_visible ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <CustomFieldsPanel taskId={task.id} definitions={cfDefs} values={cfValues} allLabels={allLabels} assignedLabels={assignedLabels} />
          </div>

          {/* CENTER COLUMN: Workspace */}
          <div className="lg:col-span-6 flex flex-col gap-8 overflow-y-auto pr-4 pl-2 lg:px-6 lg:border-x lg:border-zinc-100 pb-12" style={{ scrollbarWidth: 'thin' }}>
            
            <div className="tff-card p-5 w-full">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-zinc-900 tracking-tight text-sm">Description</h3>
                {canEdit && !isClosed && !editingDesc && (
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingDesc(true)}>
                    <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                  </Button>
                )}
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} autoFocus className="text-sm" />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={async () => { if (await saveField({ description: description || null })) setEditingDesc(false); }} disabled={saving}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setDescription(task.description || ''); setEditingDesc(false); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-600 whitespace-pre-wrap leading-relaxed">
                  {task.description || <span className="text-zinc-400 italic">No description provided.</span>}
                </p>
              )}
            </div>

            <div className="w-full">
              <h3 className="font-semibold text-zinc-900 mb-4 tracking-tight">Step-by-step Execution</h3>
              <TaskStepsPanel taskId={task.id} initial={steps} editable={canEditSteps} allowAddStep={canEditSteps} enforceSequence status={task.status} currentUserName={team.find(u => u.id === currentUserId)?.full_name ?? 'You'} />
            </div>
            
            <div className="w-full">
              <h3 className="font-semibold text-zinc-900 mb-4 tracking-tight">Work Done Summary</h3>
              <WorkDonePanel taskId={task.id} initial={workdone} currentUserId={currentUserId} />
            </div>

          </div>

          {/* RIGHT COLUMN: Collaboration & Control */}
          <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto pl-2 pr-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
            
            <div className="space-y-3 tff-card p-5">
              <h3 className="font-semibold mb-1 text-zinc-900 tracking-tight text-sm">Workflow Controls</h3>
              <TaskActions task={task} team={team} />
              {!isClosed && (
                <StuckToggle taskId={task.id} isStuck={!!task.is_stuck} reasonCode={task.stuck_reason_code} reasonNote={task.stuck_reason_note} />
              )}
              <BlockedOnClientToggle taskId={task.id} isBlocked={!!task.is_blocked_on_client} />
              {task.is_blocked_on_client && <SendReminderButton taskId={task.id} />}
              
              {task.status === 'completed' && (
                <div className="pt-2">
                  {task.is_verified ? (
                    <div className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 flex items-center gap-2">
                      <span className="font-semibold">Verified</span>
                      <span className="text-teal-600 truncate">· {task.verification_note || 'No note'}</span>
                    </div>
                  ) : (
                    <VerifyTaskButton taskId={task.id} />
                  )}
                </div>
              )}
              {canDelete && (
                <div className="pt-2">
                  <DeleteTaskButton taskId={task.id} redirectTo={basePath} onSuccess={() => { /* dock parent handles refresh */ }} />
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col min-h-[400px] bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <Tabs defaultValue="notes" className="flex flex-col h-full">
                <TabsList className="w-full justify-start rounded-none border-b border-zinc-100 px-4 pt-2 bg-zinc-50/50">
                  <TabsTrigger value="notes" className="text-xs">Notes ({notes.length})</TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
                </TabsList>
                
                <TabsContent value="notes" className="flex-1 overflow-y-auto p-4 m-0 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                  <div className="border border-zinc-200 rounded-xl p-3 bg-zinc-50 space-y-3">
                    <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add an internal note…" rows={2} className="border-0 focus-visible:ring-0 p-0 text-sm resize-none bg-transparent" />
                    <div className="flex justify-end pt-2 border-t border-zinc-200/50">
                      <Button type="button" size="sm" onClick={addNote} disabled={addingNote || !newNote.trim()} className="h-7 text-xs">
                        {addingNote ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Save
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {notes.map((n: any) => (
                      <div key={n.id} className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 flex justify-between">
                          <span>{n.users_profile?.full_name}</span>
                          <span>{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">{n.note_text}</p>
                      </div>
                    ))}
                    {notes.length === 0 && <p className="text-zinc-300 text-xs text-center py-4 italic">No internal notes yet.</p>}
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="flex-1 overflow-y-auto p-4 m-0" style={{ scrollbarWidth: 'thin' }}>
                  <div className="relative pl-4 border-l border-zinc-100 space-y-5">
                    {activity.map((a: any) => (
                      <div key={a.id} className="relative">
                        <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-white border border-teal-500" />
                        <div className="text-[10px] font-bold text-zinc-400 mb-0.5">{timeAgo(a.created_at)}</div>
                        <div className="text-xs text-zinc-700 leading-snug">
                          <span className="font-semibold text-zinc-900">{a.users_profile?.full_name || 'System'}</span>{' '}
                          {a.action}
                          {a.field_name === 'status' && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-[10px] lowercase border-zinc-200 bg-zinc-50 font-mono">
                                {a.old_value || '—'} → {a.new_value}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {activity.length === 0 && <p className="text-zinc-400 text-xs italic">No activity recorded.</p>}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
      <dt className="text-zinc-500 text-xs">{label}</dt>
      <dd className="font-semibold text-zinc-900 text-right">{value}</dd>
    </div>
  );
}

function turnaroundDays(created: string, completed: string): number {
  const c = new Date(created);
  const d = new Date(completed);
  const diff = d.getTime() - c.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function fmtHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
