'use client';

import { DockLink } from '@/components/shell/dock-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Check, X, Loader2, Plus, Clock, Trash2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Switch } from '@/components/ui/switch';
import { formatDateIST, formatTimeIST, timeAgo, cn } from '@/lib/utils';
import TaskStepsPanel from '@/components/tasks/task-steps-panel';
import CustomFieldsPanel from '@/components/tasks/custom-fields-panel';
import { assignTaskAction } from '@/lib/actions/tasks';
import { toast } from 'sonner';
import { fmtHM } from './helpers';
import { TaskStatusStepper } from './status-stepper';
import type { Task } from './types';
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
    subServices,
    taskTemplates,
    currentUserId,
    canEdit,
    canEditSteps,
    clientPath,
    onRefresh,
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
    saveField,
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
          {/* Title + Status + Client */}
          <div className="tff-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-zinc-500">{task.task_number ?? '—'}</span>
              {task.is_billable && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                  Billable
                </span>
              )}
            </div>
            <h1 className="text-base font-semibold text-zinc-900 leading-tight mb-2">
              {task.sub_services ? `${task.sub_services.name} — ${task.clients?.business_name ?? ''}` : task.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'teal' : 'warning'}>
                {task.status === 'in_progress' ? 'In progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </Badge>
              {task.is_verified && (
                <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">Verified</Badge>
              )}
              <DockLink item={{ type: 'client', id: task.client_id }} href={clientPath} className="text-xs text-zinc-500 hover:text-teal-700 hover:underline font-medium">
                {task.clients?.business_name}
              </DockLink>
            </div>
          </div>

          {/* Status: stage, dates and next actions. Updates the instant the user acts. */}
          <TaskStatusStepper
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

          {/* Editable Metadata Grid */}
          <div className="tff-card p-4 grid grid-cols-2 gap-x-6 gap-y-4">
            {/* Priority */}
            <div className="group min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-zinc-500">Priority</div>
                {canEdit && !isClosed && !editingPriority && (
                  <button type="button" onClick={() => setEditingPriority(true)} className="text-zinc-500 hover:text-zinc-800 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                )}
              </div>
              {editingPriority ? (
                <div className="flex items-center gap-1">
                  <Select value={priority} onValueChange={(v) => setPriority(v as Task['priority'])}>
                    <SelectTrigger className="h-7 text-xs w-24 px-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => { if (await saveField({ priority })) setEditingPriority(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setPriority(task.priority); setEditingPriority(false); }}><X className="h-3 w-3 text-zinc-500" /></Button>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900 capitalize">{task.priority}</div>
              )}
            </div>

            {/* Due date */}
            <div className="group min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-zinc-500">Due date</div>
                {canEdit && !isClosed && !editingDueDate && (
                  <button type="button" onClick={() => setEditingDueDate(true)} className="text-zinc-500 hover:text-zinc-800 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                )}
              </div>
              {editingDueDate ? (
                <div className="flex items-center gap-1">
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-7 text-xs w-28 px-1" />
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => { if (await saveField({ due_date: dueDate || null })) setEditingDueDate(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setDueDate(task.due_date ? task.due_date.slice(0, 10) : ''); setEditingDueDate(false); }}><X className="h-3 w-3 text-zinc-500" /></Button>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">{task.due_date ? formatDateIST(task.due_date) : '—'}</div>
              )}
            </div>

            {/* Period */}
            <div className="group min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-zinc-500">Period</div>
                {canEdit && !isClosed && !editingPeriod && (
                  <button type="button" onClick={() => setEditingPeriod(true)} className="text-zinc-500 hover:text-zinc-800 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                )}
              </div>
              {editingPeriod ? (
                <div className="flex items-center gap-1">
                  <Input type="number" value={periodYear} onChange={(e) => setPeriodYear(e.target.value)} className="w-14 h-6 text-xs px-1" placeholder="YYYY" />
                  <Input type="number" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} className="w-10 h-6 text-xs px-1" placeholder="MM" />
                  <Input type="number" value={periodQuarter} onChange={(e) => setPeriodQuarter(e.target.value)} className="w-10 h-6 text-xs px-1" placeholder="Q" />
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => { if (await saveField({ period_year: periodYear ? parseInt(periodYear) : null, period_month: periodMonth ? parseInt(periodMonth) : null, period_quarter: periodQuarter ? parseInt(periodQuarter) : null })) setEditingPeriod(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                  <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setPeriodYear(String(task.period_year ?? '')); setPeriodMonth(String(task.period_month ?? '')); setPeriodQuarter(String(task.period_quarter ?? '')); setEditingPeriod(false); }}><X className="h-3 w-3 text-zinc-500" /></Button>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">{task.period_month && task.period_year ? `${task.period_month}/${task.period_year}${task.period_quarter ? ` · Q${task.period_quarter}` : ''}` : '—'}</div>
              )}
            </div>

            {/* Assignees */}
            <div className="group min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-zinc-500">Assignees</div>
                {!isClosed && !editingAssignee && (
                  <button type="button" onClick={() => setEditingAssignee(true)} className="text-zinc-500 hover:text-zinc-800 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                )}
              </div>
              {editingAssignee ? (
                <div className="space-y-2">
                  <MultiSelect
                    options={team.map((u) => ({ value: u.id, label: u.full_name, searchString: u.full_name.toLowerCase() }))}
                    value={assigneeIds}
                    onChange={setAssigneeIds}
                    placeholder="Select assignees"
                    searchPlaceholder="Search team..."
                  />
                  <div className="text-xs text-zinc-500">Reviewers</div>
                  <MultiSelect
                    options={team.map((u) => ({ value: u.id, label: u.full_name, searchString: u.full_name.toLowerCase() }))}
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
                      setAssigneeIds(task.assignees?.map((a) => a.id) ?? (task.assigned_to ? [task.assigned_to] : []));
                      setReviewerIds(task.reviewers?.map((r) => r.id) ?? (task.reviewer_id ? [task.reviewer_id] : []));
                      setEditingAssignee(false);
                    }}><X className="h-3 w-3 text-zinc-500" /></Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">
                  {(task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : []).map((a) => a.full_name).join(', ') || '—'}
                </div>
              )}
            </div>

            {/* Billing */}
            <div className="group min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-zinc-500">Billing</div>
                {canEdit && !isClosed && !editingBilling && (
                  <button type="button" onClick={() => setEditingBilling(true)} className="text-zinc-500 hover:text-zinc-800 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
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
                      <Input value={billRef} onChange={(e) => setBillRef(e.target.value)} placeholder="Ref" className="h-6 text-xs" />
                      <Input type="number" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="Amount" className="h-6 text-xs" />
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => {
                      const numAmount = parseFloat(billAmount);
                      if (await saveField({ is_billable: billable, bill_reference: billRef || null, bill_amount: isNaN(numAmount) ? null : numAmount })) setEditingBilling(false);
                    }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                      setBillable(task.is_billable ?? false);
                      setBillRef(task.bill_reference ?? '');
                      setBillAmount(String(task.bill_amount ?? ''));
                      setEditingBilling(false);
                    }}><X className="h-3 w-3 text-zinc-500" /></Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">{task.is_billable ? `Yes · ${task.bill_reference || 'No ref'} · ₹${task.bill_amount ?? 0}` : 'No'}</div>
              )}
            </div>

            {/* ARN */}
            <div className="group min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-zinc-500">ARN</div>
                {canEdit && !isClosed && !editingArn && (
                  <button type="button" onClick={() => setEditingArn(true)} className="text-zinc-500 hover:text-zinc-800 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                )}
              </div>
              {editingArn ? (
                <div className="space-y-2">
                  <Input value={arnRef} onChange={(e) => setArnRef(e.target.value)} placeholder="ARN reference" className="h-6 text-xs" />
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
                    }}><X className="h-3 w-3 text-zinc-500" /></Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">{task.arn_reference || '—'}</div>
              )}
            </div>

            {/* Service */}
            <div className="group min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-zinc-500">Service</div>
                {canEdit && !isClosed && !editingService && (
                  <button type="button" onClick={() => setEditingService(true)} className="text-zinc-500 hover:text-zinc-800 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity" aria-label="Edit" title="Edit service"><Pencil className="h-3.5 w-3.5" /></button>
                )}
              </div>
              {editingService ? (
                <div className="space-y-2">
                  <Select value={selectedSubServiceId} onValueChange={(v) => { setSelectedSubServiceId(v); setSelectedTemplateId(''); }}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select service" /></SelectTrigger>
                    <SelectContent>
                      {subServices.map((s) => (
                        <SelectItem key={s.sub_service_id} value={s.sub_service_id} className="text-xs">
                          {s.sub_services?.services?.name ? `${s.sub_services.services.name} › ` : ''}{s.sub_services?.name || s.sub_service_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (await saveField({ sub_service_id: selectedSubServiceId || null, task_template_id: null })) setEditingService(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedSubServiceId(task.sub_service_id || ''); setSelectedTemplateId(task.task_template_id || ''); setEditingService(false); }}><X className="h-3 w-3 text-zinc-500" /></Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">{task.sub_services ? `${task.sub_services.services?.name ?? ''} › ${task.sub_services.name}` : '—'}</div>
              )}
            </div>

            {/* Template */}
            <div className="group min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-zinc-500">Template</div>
                {canEdit && !isClosed && !editingTemplate && (
                  <button type="button" onClick={() => setEditingTemplate(true)} className="text-zinc-500 hover:text-zinc-800 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity" aria-label="Edit" title="Edit template"><Pencil className="h-3.5 w-3.5" /></button>
                )}
              </div>
              {editingTemplate ? (
                <div className="space-y-2">
                  <Select value={selectedTemplateId || '__none__'} onValueChange={(v) => setSelectedTemplateId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select template" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs">No template</SelectItem>
                      {(() => {
                        const availableTemplates = taskTemplates.filter((t) => t.sub_service_id === (selectedSubServiceId || task.sub_service_id));
                        if (availableTemplates.length === 0) {
                          return <SelectItem value="__empty__" disabled className="text-xs text-zinc-500">No templates for this sub-service</SelectItem>;
                        }
                        return availableTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">{t.title}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); const taskTemplateId = selectedTemplateId && selectedTemplateId !== '__empty__' ? selectedTemplateId : null; if (await saveField({ task_template_id: taskTemplateId })) setEditingTemplate(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                    <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedTemplateId(task.task_template_id || ''); setEditingTemplate(false); }}><X className="h-3 w-3 text-zinc-500" /></Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-900">{taskTemplates.find((t) => t.id === task.task_template_id)?.title || (canEdit && !isClosed ? <span className="text-zinc-500 font-normal">No template — click to set</span> : '—')}</div>
              )}
            </div>
          </div>

          {/* Steps — always visible */}
          {steps.length > 0 && (
            <TaskStepsPanel taskId={task.id} initial={steps} editable={canEditSteps} allowAddStep={canEditSteps} enforceSequence status={task.status as import('@/lib/validation/schemas').TaskStatus} currentUserName={team.find(u => u.id === currentUserId)?.full_name ?? 'You'} />
          )}

          {/* Description */}
          <div className="tff-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="tff-section-title">Description</h3>
              {canEdit && !isClosed && !editingDesc && (
                <button type="button" onClick={() => setEditingDesc(true)} className="text-zinc-500 hover:text-zinc-800 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
              )}
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="text-sm" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={async () => { if (await saveField({ description: description || null })) setEditingDesc(false); }} disabled={saving}>Save</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setDescription(task.description || ''); setEditingDesc(false); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <p className={cn('text-xs text-zinc-600 whitespace-pre-wrap leading-relaxed', !descExpanded && 'line-clamp-3')}>
                  {task.description || <span className="text-zinc-500 italic">No description provided.</span>}
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
              <h3 className="tff-section-title flex items-center gap-1.5">
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
                {workdone.slice(0, 10).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium tabular-nums text-xs">{fmtHM(e.duration_minutes)}</span>
                      <span className="text-zinc-500 mx-1">·</span>
                      <span className="text-zinc-600 text-xs">{e.users_profile?.full_name ?? 'You'}</span>
                      <span className="text-zinc-500 mx-1">·</span>
                      {e.started_at && e.ended_at ? (
                        <span className="text-zinc-500 text-xs">{formatTimeIST(e.started_at)} – {formatTimeIST(e.ended_at)}</span>
                      ) : (
                        <span className="text-zinc-500 text-xs">{formatDateIST(e.work_date)}</span>
                      )}
                      {e.note && <div className="text-xs text-zinc-500 truncate">{e.note}</div>}
                    </div>
                    {e.user_id === currentUserId && (
                      <button type="button" onClick={() => removeWorkEntry(e.id)} disabled={workPending} className="text-zinc-500 hover:text-red-600 p-1" aria-label="Delete entry">
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
              <h3 className="tff-section-title">Notes</h3>
              {notes.length > 2 && (
                <span className="text-xs text-zinc-500">{notes.length} total</span>
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
              <p className="text-xs text-zinc-500 italic">No notes yet.</p>
            ) : (
              <div className="space-y-2">
                {notes.slice(-2).map((n) => (
                  <div key={n.id} className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                    <div className="text-xs font-medium text-zinc-500 mb-1 flex justify-between">
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
  );
}
