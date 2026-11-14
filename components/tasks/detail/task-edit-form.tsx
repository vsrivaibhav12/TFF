'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { assignTaskAction } from '@/lib/actions/tasks';
import { diffFields } from '@/lib/services/field-diff';
import { taskToEditValues } from '@/lib/services/task-edit-values';
import { PeriodPicker } from '@/components/ui/period-picker';
import { defaultPeriodKey, resolveTaskPeriodType, subServicePeriodType } from '@/lib/periods';
import { todayIST } from '@/lib/utils';
import type { TaskDetailCtx } from './use-task-detail';

const LIMITED_KEYS = [
  'sub_service_id', 'task_template_id', 'period_key',
  'is_billable', 'bill_reference', 'bill_amount', 'arn_reference', 'is_arn_client_visible', 'description',
] as const;
const FULL_KEYS = [...LIMITED_KEYS, 'priority', 'due_date'] as const;

function floatOrNull(v: string): number | null {
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
}

/** One form for every editable field of a task, with a single Save. */
export function TaskEditForm({ ctx }: { ctx: TaskDetailCtx }) {
  const { task, team, subServices, taskTemplates, editMode, canAssign, clientGstFrequency, saveField, setEditing, onRefresh } = ctx;
  const limited = editMode === 'limited';

  // Everything is compared against what the task looked like when the form opened, so a refresh of the
  // task behind the form can never make an untouched field look changed (and be written back).
  const [snapshot] = useState(() => taskToEditValues(task));
  const [originalAssignees] = useState<string[]>(() => task.assignees?.map((a) => a.id) ?? (task.assigned_to ? [task.assigned_to] : []));
  const [originalReviewers] = useState<string[]>(() => task.reviewers?.map((r) => r.id) ?? (task.reviewer_id ? [task.reviewer_id] : []));

  const [subServiceId, setSubServiceId] = useState(task.sub_service_id ?? '');
  const [templateId, setTemplateId] = useState(task.task_template_id ?? '');
  const [periodKey, setPeriodKey] = useState(snapshot.period_key ?? '');
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 10) : '');
  const [priority, setPriority] = useState(task.priority);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(originalAssignees);
  const [reviewerIds, setReviewerIds] = useState<string[]>(originalReviewers);
  const [billable, setBillable] = useState(task.is_billable ?? false);
  const [billRef, setBillRef] = useState(task.bill_reference ?? '');
  const [billAmount, setBillAmount] = useState(task.bill_amount != null ? String(task.bill_amount) : '');
  const [arnRef, setArnRef] = useState(task.arn_reference ?? '');
  const [arnVisible, setArnVisible] = useState(task.is_arn_client_visible ?? false);
  const [description, setDescription] = useState(task.description ?? '');
  const [busy, setBusy] = useState(false);

  const typeFor = (subId: string) => {
    const s = subServices.find((x) => x.sub_service_id === subId);
    return s ? resolveTaskPeriodType(subServicePeriodType(s), clientGstFrequency ?? null) : 'none';
  };
  const periodType = typeFor(subServiceId);

  function chooseService(next: string) {
    const nextType = typeFor(next);
    setSubServiceId(next);
    setTemplateId('');
    // A different kind of period needs a fresh choice. Offer the period that has just ended.
    if (nextType !== periodType) {
      const [y, m] = todayIST().split('-').map(Number);
      setPeriodKey(defaultPeriodKey(nextType, { year: y, month: m }) ?? '');
    }
  }

  const templatesForService = taskTemplates.filter((t) => t.sub_service_id === subServiceId);
  const teamOptions = team.map((u) => ({ value: u.id, label: u.full_name, searchString: u.full_name.toLowerCase() }));

  async function save() {
    const before: Record<string, unknown> = snapshot;
    const after: Record<string, unknown> = {
      sub_service_id: subServiceId || null,
      task_template_id: templateId || null,
      period_key: periodKey || null,
      is_billable: billable,
      bill_reference: billRef || null,
      bill_amount: floatOrNull(billAmount),
      arn_reference: arnRef || null,
      is_arn_client_visible: arnVisible,
      description: description || null,
      priority,
      due_date: dueDate || null,
    };
    const changed = diffFields(before, after, limited ? LIMITED_KEYS : FULL_KEYS);
    const patch = Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.to]));
    const assignmentChanged =
      !limited && canAssign && (!sameIds(assigneeIds, originalAssignees) || !sameIds(reviewerIds, originalReviewers));

    if (Object.keys(patch).length === 0 && !assignmentChanged) {
      toast.info('No changes to save');
      return;
    }

    setBusy(true);
    if (Object.keys(patch).length > 0) {
      const ok = await saveField(patch);
      if (!ok) { setBusy(false); return; }
    }
    if (assignmentChanged) {
      const r = await assignTaskAction({ task_id: task.id, assigned_to: assigneeIds, reviewer_id: reviewerIds });
      if (!r.success) {
        setBusy(false);
        toast.error(`Fields saved, but assignment failed: ${r.error}`);
        onRefresh?.();
        return;
      }
      toast.success('Assignment updated');
      onRefresh?.();
    }
    setBusy(false);
    setEditing(false);
  }

  return (
    <div className="tff-card p-4 space-y-4" data-testid="task-edit-form">
      {limited && (
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          This task is completed. You can correct its service, period, billing, ARN and description. Reopen the task to change priority, due date or assignees.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-slate-500">Service</Label>
          <Select
            value={subServiceId}
            onValueChange={chooseService}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select service" /></SelectTrigger>
            <SelectContent>
              {subServices.map((s) => (
                <SelectItem key={s.sub_service_id} value={s.sub_service_id} className="text-sm">
                  {s.sub_services?.services?.name ? `${s.sub_services.services.name} › ` : ''}{s.sub_services?.name || s.sub_service_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-slate-500">Template</Label>
          <Select value={templateId || '__none__'} onValueChange={(v) => setTemplateId(v === '__none__' ? '' : v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="No template" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-sm">No template</SelectItem>
              {templatesForService.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-sm">{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subServiceId && templatesForService.length === 0 && (
            <p className="text-xs text-slate-500">No templates for this service.</p>
          )}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-slate-500">Period</Label>
          <PeriodPicker type={periodType} value={periodKey} onChange={setPeriodKey} />
        </div>

        {!limited && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-sm" />
            </div>
          </>
        )}

        {!limited && canAssign && (
          <>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-slate-500">Assignees</Label>
              <MultiSelect options={teamOptions} value={assigneeIds} onChange={setAssigneeIds} placeholder="Select assignees" searchPlaceholder="Search team..." />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-slate-500">Reviewers</Label>
              <MultiSelect options={teamOptions} value={reviewerIds} onChange={setReviewerIds} placeholder="Select reviewers" searchPlaceholder="Search team..." />
            </div>
          </>
        )}

        <div className="sm:col-span-2 flex items-center justify-between border-t border-slate-100 pt-3">
          <Label className="text-sm text-slate-700">Billable</Label>
          <Switch checked={billable} onCheckedChange={setBillable} />
        </div>
        {billable && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Bill reference</Label>
              <Input value={billRef} onChange={(e) => setBillRef(e.target.value)} placeholder="INV-2026-01" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Bill amount (₹)</Label>
              <Input type="number" min={0} value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="0" className="h-9 text-sm" />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">ARN reference</Label>
          <Input value={arnRef} onChange={(e) => setArnRef(e.target.value)} placeholder="ARN12345678" className="h-9 text-sm" />
        </div>
        <div className="flex items-end justify-between pb-1.5">
          <Label className="text-sm text-slate-700">ARN visible to client</Label>
          <Switch checked={arnVisible} onCheckedChange={setArnVisible} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-slate-500">Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="text-sm" maxLength={2000} />
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
        <Button type="button" size="sm" onClick={save} disabled={busy}>
          {busy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Save changes
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
      </div>
    </div>
  );
}
