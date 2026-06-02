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
  isModal?: boolean;
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
  isModal,
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
    <div className={`flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 ${isModal ? 'h-full' : 'h-[calc(100vh-6.5rem)]'}`}>
      {!isModal && (
        <div className="flex-none mb-4">
          <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 font-medium">
            <ChevronLeft className="h-4 w-4" /> Back to Tasks
          </Link>
        </div>
      )}

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
                  <h1 className="tff-page-title leading-tight">{task.title}</h1>
                  {!isClosed && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingTitle(true)}>
                      <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'teal' : 'warning'}>
                  {task.status.replace('_', ' ')}
                </Badge>
                {task.is_verified && (
                  <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">Verified</Badge>
                )}
                <Link href={clientPath} className="text-sm text-zinc-500 hover:text-teal-700 hover:underline font-medium">
                  {task.clients?.business_name}
                </Link>
              </div>
            </div>
            
            {task.labels && task.labels.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {task.labels.map((label: string) => (
                  <Badge key={label} variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200">{label}</Badge>
                ))}
              </div>
            )}
          </div>

          <div className="tff-card p-5">
            <h3 className="font-semibold mb-3 text-zinc-900 tracking-tight text-sm">Key Details</h3>
            <dl className="space-y-2 text-sm">
              
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
                <dt className="text-zinc-500 text-xs flex items-center gap-1">Period {!isClosed && <Button size="sm" variant="ghost" className="h-4 w-4 p-0 ml-1" onClick={() => setEditingPeriod(true)}><Pencil className="h-3 w-3 text-zinc-400" /></Button>}</dt>
                <dd className="font-semibold text-zinc-900">
                  {editingPeriod ? (
                    <div className="flex items-center gap-1">
                      <Input type="number" value={periodYear} onChange={(e) => setPeriodYear(e.target.value)} className="w-14 h-6 text-[10px] px-1" placeholder="YYYY" />
                      <Input type="number" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} className="w-10 h-6 text-[10px] px-1" placeholder="MM" />
                      <Input type="number" value={periodQuarter} onChange={(e) => setPeriodQuarter(e.target.value)} className="w-10 h-6 text-[10px] px-1" placeholder="Q" />
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => { if (await saveField({ period_year: periodYear ? parseInt(periodYear) : null, period_month: periodMonth ? parseInt(periodMonth) : null, period_quarter: periodQuarter ? parseInt(periodQuarter) : null })) setEditingPeriod(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setPeriodYear(task.period_year ?? ''); setPeriodMonth(task.period_month ?? ''); setPeriodQuarter(task.period_quarter ?? ''); setEditingPeriod(false); }}><X className="h-3 w-3 text-zinc-400" /></Button>
                    </div>
                  ) : (
                    task.period_month && task.period_year ? `${task.period_month}/${task.period_year}${task.period_quarter ? ` · Q${task.period_quarter}` : ''}` : '—'
                  )}
                </dd>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
                <dt className="text-zinc-500 text-xs flex items-center gap-1">Priority {!isClosed && <Button size="sm" variant="ghost" className="h-4 w-4 p-0 ml-1" onClick={() => setEditingPriority(true)}><Pencil className="h-3 w-3 text-zinc-400" /></Button>}</dt>
                <dd className="font-semibold text-zinc-900">
                  {editingPriority ? (
                    <div className="flex items-center gap-1">
                      <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                        <SelectTrigger className="h-6 text-[10px] w-20 px-1"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => { if (await saveField({ priority })) setEditingPriority(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setPriority(task.priority); setEditingPriority(false); }}><X className="h-3 w-3 text-zinc-400" /></Button>
                    </div>
                  ) : (
                    <span className="capitalize">{task.priority}</span>
                  )}
                </dd>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
                <dt className="text-zinc-500 text-xs flex items-center gap-1">Due Date {!isClosed && <Button size="sm" variant="ghost" className="h-4 w-4 p-0 ml-1" onClick={() => setEditingDueDate(true)}><Pencil className="h-3 w-3 text-zinc-400" /></Button>}</dt>
                <dd className="font-semibold text-zinc-900">
                  {editingDueDate ? (
                    <div className="flex items-center gap-1">
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-6 text-[10px] w-28 px-1" />
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => { if (await saveField({ due_date: dueDate || null })) setEditingDueDate(false); }} disabled={saving}><Check className="h-3 w-3 text-teal-600" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setDueDate(task.due_date ? task.due_date.slice(0, 10) : ''); setEditingDueDate(false); }}><X className="h-3 w-3 text-zinc-400" /></Button>
                    </div>
                  ) : (
                    task.due_date ? formatDateIST(task.due_date) : '—'
                  )}
                </dd>
              </div>

              <DetailItem label="Assignee" value={task.assignee?.full_name || '—'} />
              <DetailItem label="Reviewer" value={task.reviewer?.full_name || '—'} />
              <DetailItem label="Service" value={task.sub_services ? `${task.sub_services.services?.name ?? ''} › ${task.sub_services.name}` : '—'} />
              <DetailItem label="Created" value={formatDateIST(task.created_date) || '—'} />
              <DetailItem label="Completed" value={formatDateIST(task.completed_date) || 'Not completed'} />

            </dl>
          </div>

          {/* Description moved to center column */}

          <div className="tff-card p-5 relative group">
            <h3 className="font-semibold mb-3 text-zinc-900 tracking-tight text-sm">Finance & Ref</h3>
            {!isClosed && !editingFinance && (
              <Button size="sm" variant="ghost" className="absolute top-4 right-4 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingFinance(true)}>
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
                  <Button size="sm" className="h-7 px-2 text-xs" onClick={async () => {
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
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => {
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
              {!isClosed && !editingDesc && (
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingDesc(true)}>
                  <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                </Button>
              )}
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} autoFocus className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={async () => { if (await saveField({ description: description || null })) setEditingDesc(false); }} disabled={saving}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setDescription(task.description || ''); setEditingDesc(false); }}>Cancel</Button>
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
            {task.status !== 'completed' && (
              <div className="pt-2">
                <DeleteTaskButton taskId={task.id} redirectTo={basePath} />
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
                    <Button size="sm" onClick={addNote} disabled={addingNote || !newNote.trim()} className="h-7 text-xs">
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
