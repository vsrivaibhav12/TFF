'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Pencil, Check, X, Loader2, CalendarDays } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatDateIST, timeAgo } from '@/lib/utils';
import TaskActions from '@/app/team/tasks/[id]/task-actions';
import TaskStepsPanel from '@/components/tasks/task-steps-panel';
import SendReminderButton from '@/components/tasks/send-reminder-button';
import StuckToggle from '@/components/tasks/stuck-toggle';
import BlockedOnClientToggle from '@/components/tasks/blocked-on-client-toggle';
import CustomFieldsPanel from '@/components/tasks/custom-fields-panel';
import WorkDonePanel from '@/components/tasks/workdone-panel';
import DeleteTaskButton from '@/components/tasks/delete-task-button';
import VerifyTaskButton from '@/components/tasks/verify-task-button';
import { updateTaskAction, addTaskNoteAction } from '@/lib/actions/tasks';
import { toast } from 'sonner';

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
  currentUserId: string;
  canEditSteps: boolean;
  basePath: string;
  clientPath: string;
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
  currentUserId,
  canEditSteps,
  basePath,
  clientPath,
}: Props) {
  const isClosed = task.status === 'completed' || task.status === 'cancelled';
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editingBilling, setEditingBilling] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [periodYear, setPeriodYear] = useState(task.period_year ?? '');
  const [periodMonth, setPeriodMonth] = useState(task.period_month ?? '');
  const [periodQuarter, setPeriodQuarter] = useState(task.period_quarter ?? '');
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 10) : '');
  
  const [editingFinance, setEditingFinance] = useState(false);
  const [billable, setBillable] = useState(task.is_billable ?? false);
  const [billRef, setBillRef] = useState(task.bill_reference ?? '');
  const [billAmount, setBillAmount] = useState(task.bill_amount ?? '');
  const [arnRef, setArnRef] = useState(task.arn_reference ?? '');
  const [arnVisible, setArnVisible] = useState(task.is_arn_client_visible ?? false);

  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  async function addNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    const r = await addTaskNoteAction({ task_id: task.id, body: newNote.trim() });
    setAddingNote(false);
    if (!r.success) { toast.error(r.error); return; }
    toast.success('Note added');
    setNewNote('');
    // refresh handled by Next.js if action has revalidatePath, which addTaskNoteAction does.
  }

  async function saveField(updates: any, onSuccess?: () => void) {
    setSaving(true);
    const r = await updateTaskAction({ task_id: task.id, ...updates });
    setSaving(false);
    if (!r.success) { toast.error(r.error); return false; }
    toast.success('Updated');
    onSuccess?.();
    return true;
  }

  return (
    <div className="space-y-8">
      <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Tasks
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-zinc-400">{task.task_number ?? '—'}</span>
          {task.is_billable && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              Billable{task.bill_reference ? ` · ${task.bill_reference}` : ''}
            </span>
          )}
        </div>

        {/* Editable title */}
        <div className="flex items-center gap-2">
          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-semibold" autoFocus />
              <Button size="sm" variant="ghost" onClick={async () => { if (await saveField({ title })) setEditingTitle(false); }} disabled={saving}>
                <Check className="h-4 w-4 text-teal-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setTitle(task.title); setEditingTitle(false); }}>
                <X className="h-4 w-4 text-zinc-400" />
              </Button>
            </div>
          ) : (
            <>
              <h1 className="tff-page-title">{task.title}</h1>
              {!isClosed && (
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingTitle(true)}>
                  <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                </Button>
              )}
            </>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Badge variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'teal' : 'warning'}>
            {task.status.replace('_', ' ')}
          </Badge>
          {task.is_verified && (
            <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">Verified</Badge>
          )}
          <Link href={clientPath} className="text-sm text-zinc-500 hover:text-teal-700 hover:underline">
            {task.clients?.business_name}
          </Link>
        </div>

        {/* Editable period */}
        <div className="mt-2 flex items-center gap-2">
          {editingPeriod ? (
            <div className="flex items-center gap-2">
              <Input type="number" min={2000} max={2100} value={periodYear} onChange={(e) => setPeriodYear(e.target.value)} className="w-20 h-7 text-xs" placeholder="Year" />
              <Input type="number" min={1} max={12} value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} className="w-16 h-7 text-xs" placeholder="Month" />
              <Input type="number" min={1} max={4} value={periodQuarter} onChange={(e) => setPeriodQuarter(e.target.value)} className="w-16 h-7 text-xs" placeholder="Q" />
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={async () => { if (await saveField({ period_year: periodYear ? parseInt(periodYear) : null, period_month: periodMonth ? parseInt(periodMonth) : null, period_quarter: periodQuarter ? parseInt(periodQuarter) : null })) setEditingPeriod(false); }} disabled={saving}>
                <Check className="h-3 w-3 text-teal-600" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setPeriodYear(task.period_year ?? ''); setPeriodMonth(task.period_month ?? ''); setPeriodQuarter(task.period_quarter ?? ''); setEditingPeriod(false); }}>
                <X className="h-3 w-3 text-zinc-400" />
              </Button>
            </div>
          ) : (
            <>
              <span className="text-xs text-zinc-500">
                Period: {task.period_month && task.period_year ? `${task.period_month}/${task.period_year}${task.period_quarter ? ` · Q${task.period_quarter}` : ''}` : '—'}
              </span>
              {!isClosed && (
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingPeriod(true)}>
                  <Pencil className="h-3 w-3 text-zinc-400" />
                </Button>
              )}
            </>
          )}
        </div>

        {/* Editable priority + due date */}
        <div className="mt-2 flex items-center gap-4 flex-wrap">
          {editingPriority ? (
            <div className="flex items-center gap-2">
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={async () => { if (await saveField({ priority })) setEditingPriority(false); }} disabled={saving}>
                <Check className="h-3 w-3 text-teal-600" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setPriority(task.priority); setEditingPriority(false); }}>
                <X className="h-3 w-3 text-zinc-400" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Badge variant="outline">{task.priority}</Badge>
              {!isClosed && (
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingPriority(true)}>
                  <Pencil className="h-3 w-3 text-zinc-400" />
                </Button>
              )}
            </div>
          )}

          {editingDueDate ? (
            <div className="flex items-center gap-2">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-7 text-xs w-36" />
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={async () => { if (await saveField({ due_date: dueDate || null })) setEditingDueDate(false); }} disabled={saving}>
                <Check className="h-3 w-3 text-teal-600" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setDueDate(task.due_date ? task.due_date.slice(0, 10) : ''); setEditingDueDate(false); }}>
                <X className="h-3 w-3 text-zinc-400" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-zinc-500 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Due: {task.due_date ? formatDateIST(task.due_date) : '—'}</span>
              {!isClosed && (
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingDueDate(true)}>
                  <Pencil className="h-3 w-3 text-zinc-400" />
                </Button>
              )}
            </div>
          )}
        </div>

        {task.labels && task.labels.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            {task.labels.map((label: string) => (
              <Badge key={label} variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200">{label}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Tabs + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs defaultValue="steps">
            <TabsList>
              <TabsTrigger value="steps">Steps ({steps.length})</TabsTrigger>
              <TabsTrigger value="work">Work done</TabsTrigger>
              <TabsTrigger value="notes">Notes & Billing ({notes.length})</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity ({activity.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="steps" className="space-y-6">
              <TaskStepsPanel taskId={task.id} initial={steps} editable={canEditSteps} allowAddStep={canEditSteps} enforceSequence status={task.status} />

              {/* Moved from Overview tab */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 tff-card p-4">
                  <h3 className="text-sm font-semibold mb-2">Workflow Controls</h3>
                  <TaskActions task={task} team={team} />
                  {!isClosed && (
                    <StuckToggle taskId={task.id} isStuck={!!task.is_stuck} reasonCode={task.stuck_reason_code} reasonNote={task.stuck_reason_note} />
                  )}
                  <BlockedOnClientToggle taskId={task.id} isBlocked={!!task.is_blocked_on_client} />
                  {task.is_blocked_on_client && <SendReminderButton taskId={task.id} />}
                </div>

                {/* Moved ARN Reference from Notes tab */}
                <div className="tff-card p-4 relative group">
                  <h3 className="text-sm font-semibold mb-3">Reference Information</h3>
                  {!isClosed && !editingFinance && (
                    <Button size="sm" variant="ghost" className="absolute top-3 right-3 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingFinance(true)}>
                      <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                    </Button>
                  )}
                  {editingFinance ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">ARN / Ref</Label>
                          <Input value={arnRef} onChange={(e) => setArnRef(e.target.value)} placeholder="e.g. ARN12345678" className="text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">ARN client visible</Label>
                          <div className="flex items-center gap-2 h-9">
                            <Switch checked={arnVisible} onCheckedChange={setArnVisible} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                        <Button size="sm" onClick={async () => {
                          const ok = await saveField({ 
                            arn_reference: arnRef || null, 
                            is_arn_client_visible: arnVisible 
                          });
                          if (ok) setEditingFinance(false);
                        }} disabled={saving}><Check className="h-3 w-3" /> Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setArnRef(task.arn_reference ?? '');
                          setArnVisible(task.is_arn_client_visible ?? false);
                          setEditingFinance(false);
                        }} disabled={saving}><X className="h-3 w-3" /> Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-zinc-500 text-xs">ARN / Ref</span>
                        <p className="font-medium">{task.arn_reference || '—'}</p>
                      </div>
                      {task.arn_reference && (
                        <div>
                          <span className="text-zinc-500 text-xs">Client visible</span>
                          <p className="font-medium">{task.is_arn_client_visible ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="work">
              <WorkDonePanel taskId={task.id} initial={workdone} currentUserId={currentUserId} />
            </TabsContent>

            <TabsContent value="notes">
              <div className="space-y-4">
                {/* Billing summary card */}
                <div className="tff-card p-4 relative group">
                  <h3 className="text-sm font-semibold mb-3">Billing details</h3>
                  {!isClosed && !editingBilling && (
                    <Button size="sm" variant="ghost" className="absolute top-3 right-3 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingBilling(true)}>
                      <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                    </Button>
                  )}
                  {editingBilling ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Billable</Label>
                          <div className="flex items-center gap-2 h-9">
                            <Switch checked={billable} onCheckedChange={setBillable} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Bill reference</Label>
                          <Input value={billRef} onChange={(e) => setBillRef(e.target.value)} placeholder="e.g. INV-2026-01" className="text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Bill amount (₹)</Label>
                          <Input type="number" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="0.00" className="text-sm" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                        <Button size="sm" onClick={async () => {
                          const numAmount = parseFloat(billAmount as string);
                          const ok = await saveField({ 
                            is_billable: billable, 
                            bill_reference: billRef || null, 
                            bill_amount: isNaN(numAmount) ? null : numAmount
                          });
                          if (ok) setEditingBilling(false);
                        }} disabled={saving}><Check className="h-3 w-3" /> Save Billing</Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setBillable(task.is_billable ?? false);
                          setBillRef(task.bill_reference ?? '');
                          setBillAmount(task.bill_amount ?? '');
                          setEditingBilling(false);
                        }} disabled={saving}><X className="h-3 w-3" /> Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-zinc-500 text-xs">Billable</span>
                        <p className="font-medium">{task.is_billable ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-xs">Bill reference</span>
                        <p className="font-medium">{task.bill_reference || '—'}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-xs">Bill amount</span>
                        <p className="font-medium">{task.bill_amount ? `₹${task.bill_amount}` : '—'}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="tff-card p-6">
                  <h3 className="font-semibold mb-3">Notes ({notes.length})</h3>
                  <div className="space-y-4">
                    <div className="border border-zinc-200 rounded-xl p-3 bg-white space-y-3">
                      <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add an internal note…" rows={3} className="border-0 focus-visible:ring-0 p-0 text-sm resize-none bg-transparent" />
                      <div className="flex justify-end border-t border-zinc-100 pt-2">
                        <Button size="sm" onClick={addNote} disabled={addingNote || !newNote.trim()}>
                          {addingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null} Save note
                        </Button>
                      </div>
                    </div>
                    
                    {notes.map((n: any) => (
                      <div key={n.id} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex justify-between">
                          <span>{n.users_profile?.full_name}</span>
                          <span>{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">{n.note_text}</p>
                      </div>
                    ))}
                    {notes.length === 0 && <p className="text-zinc-300 text-xs text-center py-4 italic">No internal notes yet.</p>}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="overview" className="space-y-6">
              {/* Editable description */}
              <div className="tff-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Description</h3>
                  {!isClosed && !editingDesc && (
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingDesc(true)}>
                      <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                    </Button>
                  )}
                </div>
                {editingDesc ? (
                  <div className="space-y-2">
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} autoFocus />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={async () => { if (await saveField({ description: description || null })) setEditingDesc(false); }} disabled={saving}>
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setDescription(task.description || ''); setEditingDesc(false); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                    {task.description || <span className="text-zinc-400 italic">No description provided.</span>}
                  </p>
                )}
              </div>

              <CustomFieldsPanel taskId={task.id} definitions={cfDefs} values={cfValues} allLabels={allLabels} assignedLabels={assignedLabels} />
            </TabsContent>

            <TabsContent value="activity">
              <div className="tff-card p-6">
                <h3 className="font-semibold mb-4">Activity ({activity.length})</h3>
                <div className="relative pl-6 border-l-2 border-zinc-100 space-y-6">
                  {activity.map((a: any) => (
                    <div key={a.id} className="relative">
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-teal-500" />
                      <div className="text-xs font-bold text-zinc-400 mb-1">{timeAgo(a.created_at)}</div>
                      <div className="text-sm text-zinc-700">
                        <span className="font-semibold text-zinc-900">{a.users_profile?.full_name || 'System'}</span>{' '}
                        {a.action}
                        {a.field_name === 'status' && (
                          <Badge variant="outline" className="ml-2 text-[10px] lowercase border-zinc-100 font-mono">
                            {a.old_value || '—'} → {a.new_value}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {activity.length === 0 && <p className="text-zinc-400 text-sm">No activity recorded yet.</p>}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="tff-card p-6">
            <h3 className="font-semibold mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <DetailItem label="Due" value={formatDateIST(task.due_date)} />
              <DetailItem label="Created" value={formatDateIST(task.created_date) || '—'} />
              <DetailItem label="Started" value={formatDateIST(task.started_date) || 'Not started'} />
              <DetailItem label="Completed" value={formatDateIST(task.completed_date) || 'Not completed'} />
              {task.completed_date && task.created_date && (
                <DetailItem label="Turnaround" value={`${turnaroundDays(task.created_date, task.completed_date)} days`} />
              )}
              <DetailItem label="Task number" value={task.task_number ?? '—'} />
              <DetailItem label="Period" value={task.period_month && task.period_year ? `${task.period_month}/${task.period_year}${task.period_quarter ? ` · Q${task.period_quarter}` : ''}` : '—'} />
              <DetailItem label="Assignee" value={task.assignee?.full_name || '—'} />
              <DetailItem label="Reviewer" value={task.reviewer?.full_name || '—'} />
              <DetailItem label="Service" value={task.sub_services ? `${task.sub_services.services?.name ?? ''} › ${task.sub_services.name}` : '—'} />
              {task.is_billable && (
                <DetailItem label="Billing" value={`Billable · ${task.bill_reference || 'No ref'} · ₹${task.bill_amount ?? 0}`} />
              )}
              {task.arn_reference && (
                <DetailItem label="ARN / Ref" value={`${task.arn_reference}${task.is_arn_client_visible ? ' (client visible)' : ''}`} />
              )}
            </dl>
          </div>

          {task.status === 'completed' && (
            <div className="space-y-3">
              {task.is_verified ? (
                <div className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 flex items-center gap-2">
                  <span className="font-semibold">Verified</span>
                  <span className="text-teal-600">· {task.verification_note || 'No note'}</span>
                </div>
              ) : (
                <VerifyTaskButton taskId={task.id} />
              )}
            </div>
          )}
          {task.status !== 'completed' && (
            <div className="pt-2">
              <DeleteTaskButton taskId={task.id} redirectTo={basePath} />
            </div>
          )}

          {task.custom_fields && Object.keys(task.custom_fields).length > 0 && (
            <div className="tff-card p-6">
              <h3 className="font-semibold mb-3">Custom Fields</h3>
              <dl className="space-y-3 text-sm">
                {Object.entries(task.custom_fields as Record<string, any>).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-zinc-500 mb-1 capitalize">{key.replace(/_/g, ' ')}</dt>
                    <dd className="font-medium text-zinc-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
      <dt className="text-zinc-500 text-xs">{label}</dt>
      <dd className="font-semibold text-zinc-900">{value}</dd>
    </div>
  );
}

function turnaroundDays(created: string, completed: string): number {
  const c = new Date(created);
  const d = new Date(completed);
  const diff = d.getTime() - c.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}
