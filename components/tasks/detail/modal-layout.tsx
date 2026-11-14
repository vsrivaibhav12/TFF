'use client';

import { formatPeriodColumns } from '@/lib/periods';
import { DockLink } from '@/components/shell/dock-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { formatDateIST, timeAgo, cn, todayIST } from '@/lib/utils';
import TaskStepsPanel from '@/components/tasks/task-steps-panel';
import CustomFieldsPanel from '@/components/tasks/custom-fields-panel';
import { ReadField } from './helpers';
import { WorkLogList } from './work-log-list';
import { TaskActionRail } from './task-action-rail';
import { DuePill } from '@/components/tasks/task-cells';
import { TaskEditForm } from './task-edit-form';
import { TaskStatusStepper } from './status-stepper';
import type { } from './types';
import type { TaskDetailCtx } from './use-task-detail';

export default function TaskDetailModalLayout({ ctx }: { ctx: TaskDetailCtx }) {
  const {
    task,
    notes,
    team,
    steps,
    cfDefs,
    cfValues,
    allLabels,
    assignedLabels,
    workdone,
    taskTemplates,
    currentUserId,
    canEditSteps,
    clientPath,
    isClosed,
    editMode,
    editing,
    setEditing,
    newNote,
    setNewNote,
    addingNote,
    descExpanded,
    setDescExpanded,
    showStuckPicker,
    setShowStuckPicker,
    stuckReason,
    setStuckReason,
    isPending,
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
    workPending,
    addNote,
    handleTransition,
    transitioning,
    handleBlockedToggle,
    handleMarkStuck,
    handleUnstuck,
    submitWorkLog,
    removeWorkEntry,
  } = ctx;
  return (
        <div className="flex-1 min-h-0 flex flex-col gap-4 pb-6 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {/* Header: client, task name, and the chips that say where it stands */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DockLink item={{ type: 'client', id: task.client_id }} href={clientPath} className="text-xs font-medium text-slate-500 hover:text-teal-700">
                  {task.clients?.business_name}
                </DockLink>
                <h1 className="text-base font-semibold leading-snug tracking-tight text-slate-900">
                  {task.sub_services ? task.sub_services.name : task.title}
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <DuePill due={task.due_date ?? null} status={task.status} todayIso={todayIST()} />
              {formatPeriodColumns(task) && <span className="tff-pill tff-pill-mute">{formatPeriodColumns(task)}</span>}
              {task.task_number && <span className="tff-pill tff-pill-mute font-mono">{task.task_number}</span>}
              {task.is_billable && <span className="tff-pill tff-pill-warn">Billable</span>}
              {task.is_verified && <span className="tff-pill tff-pill-accent">Verified</span>}
              {task.is_stuck && <span className="tff-pill tff-pill-info tff-pill-dot">Stuck</span>}
            </div>
          </div>

          <TaskActionRail ctx={ctx} />
          {showStuckPicker && !isClosed && (
                <div className="space-y-2 rounded-xl border border-[#E8EAEE] bg-slate-50/60 p-3">
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

          {/* Status: stage, dates and next actions. Updates the instant the user acts. */}
          <TaskStatusStepper
            taskId={task.id}
            status={task.status}
            createdDate={task.created_date}
            startedDate={task.started_date}
            completedDate={task.completed_date}
            isBillable={task.is_billable}
            billReference={task.bill_reference}
            billAmount={task.bill_amount}
            canAct={canEditSteps}
            transitioning={transitioning}
            onTransition={handleTransition}
          />

          {/* Details: read-only values, or the edit form */}
          {editing ? (
            <TaskEditForm ctx={ctx} />
          ) : (
            <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 rounded-xl border border-[#E8EAEE] bg-slate-50/60 p-3">
              <ReadField label="Priority"><span className="capitalize">{task.priority}</span></ReadField>
              <ReadField label="Due date">{task.due_date ? formatDateIST(task.due_date) : '—'}</ReadField>
              <ReadField label="Period">
                {formatPeriodColumns(task) || '—'}
              </ReadField>
              <ReadField label="Assignees">
                {(task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : []).map((a) => a.full_name).join(', ') || '—'}
              </ReadField>
              <ReadField label="Billing">
                {task.is_billable ? `Yes · ${task.bill_reference || 'No ref'} · ₹${task.bill_amount ?? 0}` : 'No'}
              </ReadField>
              <ReadField label="ARN">{task.arn_reference || '—'}</ReadField>
              <ReadField label="Service">
                {task.sub_services ? `${task.sub_services.services?.name ?? ''} › ${task.sub_services.name}` : '—'}
              </ReadField>
              <ReadField label="Template">
                {taskTemplates.find((t) => t.id === task.task_template_id)?.title || '—'}
              </ReadField>
            </div>
          )}

          {/* Steps — always visible */}
          {steps.length > 0 && (
            <TaskStepsPanel taskId={task.id} initial={steps} editable={canEditSteps} allowAddStep={canEditSteps} enforceSequence status={task.status as import('@/lib/validation/schemas').TaskStatus} currentUserName={team.find(u => u.id === currentUserId)?.full_name ?? 'You'} />
          )}

          {/* Description (edited through the edit form) */}
          {!editing && task.description && (
            <section>
              <h3 className="tff-eyebrow mb-1.5">Description</h3>
              <p className={cn('text-xs text-slate-600 whitespace-pre-wrap leading-relaxed', !descExpanded && 'line-clamp-3')}>
                {task.description || <span className="text-slate-500 italic">No description provided.</span>}
              </p>
              {task.description && task.description.length > 120 && (
                <button type="button" onClick={() => setDescExpanded(!descExpanded)} className="mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium">
                  {descExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </section>
          )}

          {/* Labels */}
          <CustomFieldsPanel taskId={task.id} definitions={cfDefs} values={cfValues} allLabels={allLabels} assignedLabels={assignedLabels} readonly={editMode === 'none'} />

          {/* Work logging */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="tff-eyebrow">Time on this task</h3>
              {!showWorkLog && !isClosed && (
                <Button type="button" size="sm" variant="outline" onClick={() => setShowWorkLog(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Log work
                </Button>
              )}
            </div>
            {showWorkLog && (
              <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-2">
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
            <WorkLogList entries={workdone} currentUserId={currentUserId} onRemove={removeWorkEntry} removing={workPending} />
          </section>

          {/* Notes - last 2 only */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="tff-eyebrow">Notes</h3>
              {notes.length > 2 && (
                <span className="text-xs text-slate-500">{notes.length} total</span>
              )}
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3 mb-3">
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add an internal note…" rows={1} className="border-0 focus-visible:ring-0 p-0 text-sm resize-none bg-transparent min-h-[28px]" />
              <div className="flex justify-end pt-2 border-t border-slate-200/50">
                <Button type="button" size="sm" onClick={addNote} disabled={addingNote || !newNote.trim()} className="h-7 text-xs">
                  {addingNote ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Save
                </Button>
              </div>
            </div>
            {notes.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No notes yet.</p>
            ) : (
              <div className="space-y-2">
                {notes.slice(-2).map((n) => (
                  <div key={n.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="text-xs font-medium text-slate-500 mb-1 flex justify-between">
                      <span>{n.users_profile?.full_name}</span>
                      <span>{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-3">{n.note_text}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
  );
}
