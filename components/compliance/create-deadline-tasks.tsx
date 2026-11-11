'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CalendarClock, Check, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PeriodPicker } from '@/components/ui/period-picker';
import {
  changeDeadlineDueDateAction,
  createDeadlineTasksAction,
  getDeadlinePlanAction,
  type DeadlineCreateDTO,
  type DeadlinePlanDTO,
} from '@/lib/actions/deadline-tasks';
import { defaultPeriodKey, resolveTaskPeriodType, subServicePeriodType, type PeriodType } from '@/lib/periods';
import { splitByWorkload } from '@/lib/services/assignment-split';
import { formatDateIST, todayIST } from '@/lib/utils';

type Team = { id: string; full_name: string };
type SubOption = { id: string; code: string; name: string; period_type: string | null; frequency: string; service_name: string | null };

const SOURCE_LABEL: Record<DeadlinePlanDTO['due_source'], string> = {
  override: 'Changed by your firm',
  rule: 'From the compliance calendar',
  sub_service: 'From the service settings',
  none: 'No date set',
};

export default function CreateDeadlineTasks({
  subServices,
  team,
  loads,
  canRememberDefaults,
  basePath,
}: {
  subServices: SubOption[];
  team: Team[];
  loads: Record<string, number>;
  canRememberDefaults: boolean;
  basePath: string;
}) {
  const [subId, setSubId] = useState('');
  const [filing, setFiling] = useState<'monthly' | 'quarterly'>('monthly');
  const [periodKey, setPeriodKey] = useState('');
  const [plan, setPlan] = useState<DeadlinePlanDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [groupFilter, setGroupFilter] = useState('all');
  const [bulkPerson, setBulkPerson] = useState('');
  const [view, setView] = useState<'pick' | 'review' | 'done'>('pick');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [remember, setRemember] = useState(false);
  const [result, setResult] = useState<DeadlineCreateDTO | null>(null);
  const [creating, startCreate] = useTransition();
  const [changeOpen, setChangeOpen] = useState(false);

  const sub = subServices.find((s) => s.id === subId) ?? null;
  const declared = sub ? subServicePeriodType(sub) : 'none';
  const periodType: PeriodType = sub ? resolveTaskPeriodType(declared, filing === 'quarterly' ? 'qrmp' : 'monthly') : 'none';
  const teamName = (id: string) => team.find((t) => t.id === id)?.full_name ?? '';

  function defaultKeyFor(type: PeriodType): string {
    const [y, m] = todayIST().split('-').map(Number);
    return defaultPeriodKey(type, { year: y, month: m }) ?? '';
  }

  function chooseService(id: string) {
    setSubId(id);
    const s = subServices.find((x) => x.id === id);
    const d = s ? subServicePeriodType(s) : 'none';
    const type = s ? resolveTaskPeriodType(d, filing === 'quarterly' ? 'qrmp' : 'monthly') : 'none';
    setPeriodKey(defaultKeyFor(type));
    setPlan(null);
  }

  function chooseFiling(next: 'monthly' | 'quarterly') {
    setFiling(next);
    setPeriodKey(defaultKeyFor(next));
    setPlan(null);
  }

  async function loadPlan(keepChoices = false) {
    if (!subId || !periodKey) return;
    setLoading(true);
    setLoadError('');
    const r = await getDeadlinePlanAction({ sub_service_id: subId, period_key: periodKey });
    setLoading(false);
    if (!r.success) { setPlan(null); setLoadError(r.error); return; }
    setPlan(r.data);
    const ready = r.data.clients.filter((c) => c.status === 'ready');
    setSelected((prev) => (keepChoices && prev.size > 0 ? new Set(ready.filter((c) => prev.has(c.client_id)).map((c) => c.client_id)) : new Set(ready.map((c) => c.client_id))));
    // Pre-fill defaults, but only for people who are still active. Keep choices already made when only the date changed.
    const activeIds = new Set(team.map((m) => m.id));
    setAssign((prev) => {
      const initial: Record<string, string> = {};
      for (const c of ready) {
        if (keepChoices && prev[c.client_id]) initial[c.client_id] = prev[c.client_id];
        else if (c.default_assignee_id && activeIds.has(c.default_assignee_id)) initial[c.client_id] = c.default_assignee_id;
      }
      return initial;
    });
    // A task cannot be due before today, so a statutory date that has passed becomes today.
    const today = todayIST();
    setDueDate(r.data.due_date && r.data.due_date >= today ? r.data.due_date : today);
    setView('pick');
  }

  useEffect(() => {
    if (subId && periodKey) void loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subId, periodKey]);

  const groups = useMemo(() => {
    const names = new Set<string>();
    for (const c of plan?.clients ?? []) if (c.group_name) names.add(c.group_name);
    return Array.from(names).sort();
  }, [plan]);

  const visible = (plan?.clients ?? []).filter((c) => groupFilter === 'all' || c.group_name === groupFilter);
  const selectedReady = (plan?.clients ?? []).filter((c) => c.status === 'ready' && selected.has(c.client_id));
  const missing = selectedReady.filter((c) => !assign[c.client_id]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAllVisible(on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of visible) if (c.status === 'ready') { if (on) next.add(c.client_id); else next.delete(c.client_id); }
      return next;
    });
  }
  function useDefaults() {
    setAssign((prev) => {
      const next = { ...prev };
      for (const c of selectedReady) if (c.default_assignee_id) next[c.client_id] = c.default_assignee_id;
      return next;
    });
  }
  function assignSelected(userId: string) {
    if (!userId) return;
    setAssign((prev) => {
      const next = { ...prev };
      for (const c of selectedReady) next[c.client_id] = userId;
      return next;
    });
  }
  function split() {
    const map = splitByWorkload(selectedReady.map((c) => c.client_id), team.map((m) => ({ id: m.id, load: loads[m.id] ?? 0 })));
    setAssign((prev) => ({ ...prev, ...map }));
  }

  function create() {
    if (!plan) return;
    startCreate(async () => {
      const r = await createDeadlineTasksAction({
        sub_service_id: subId,
        period_key: periodKey,
        due_date: dueDate || null,
        priority,
        rows: selectedReady.map((c) => ({ client_id: c.client_id, assigned_to: assign[c.client_id] || null })),
        remember_defaults: canRememberDefaults && remember,
      });
      if (!r.success) { toast.error(r.error); return; }
      setResult(r.data);
      setView('done');
      toast.success(`${r.data.created.length} task${r.data.created.length === 1 ? '' : 's'} created`);
    });
  }

  function startOver() {
    setView('pick');
    setResult(null);
    void loadPlan();
  }

  const stepNow = view === 'review' || view === 'done' ? 3 : plan ? 2 : 1;

  return (
    <div className="space-y-5" data-testid="create-deadline-tasks">
      <ol className="flex items-center gap-5 text-sm">
        {['Deadline', 'Assign', 'Review and create'].map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span className={`h-5 w-5 rounded-full text-xs flex items-center justify-center ${stepNow > i ? 'bg-teal-600 text-white' : 'bg-zinc-100 text-zinc-500'}`}>{i + 1}</span>
            <span className={stepNow > i ? 'text-zinc-900' : 'text-zinc-500'}>{label}</span>
          </li>
        ))}
      </ol>

      {view !== 'done' && (
        <div className="tff-card p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Service</Label>
              <SearchableSelect
                options={subServices.map((s) => ({ value: s.id, label: s.service_name ? `${s.name} (${s.service_name})` : s.name, searchString: `${s.name} ${s.code}`.toLowerCase() }))}
                value={subId}
                onChange={chooseService}
                placeholder="Choose a service"
                searchPlaceholder="Search services"
              />
            </div>
            {declared === 'gst_frequency' && (
              <div className="space-y-1.5">
                <Label>Clients that file</Label>
                <Select value={filing} onValueChange={(v) => chooseFiling(v as 'monthly' | 'quarterly')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly (QRMP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {sub && periodType !== 'none' && (
              <div className="space-y-1.5">
                <Label>Period</Label>
                <PeriodPicker type={periodType} value={periodKey} onChange={setPeriodKey} />
              </div>
            )}
          </div>

          {loading && <p className="text-sm text-zinc-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading clients</p>}
          {loadError && <p className="text-sm text-red-600">{loadError}</p>}

          {plan && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-zinc-50 px-3 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-teal-600" />
                <span className="text-zinc-500">Due date</span>
                <b className="font-medium text-zinc-900">{plan.due_date ? formatDateIST(plan.due_date) : 'Not set'}</b>
                <span className="text-xs text-zinc-500">({SOURCE_LABEL[plan.due_source]})</span>
                <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => setChangeOpen(true)} data-testid="change-deadline">
                  <Pencil className="h-3 w-3 mr-1" /> Change
                </Button>
              </div>
              {plan.original_due_date && plan.original_due_date !== plan.due_date && (
                <span className="text-xs text-zinc-500">Originally {formatDateIST(plan.original_due_date)}{plan.extension_note ? `. ${plan.extension_note}` : ''}</span>
              )}
              <span className="ml-auto text-zinc-500 tabular-nums">
                {plan.counts.linked} linked · {plan.counts.applicable} apply · <b className="font-medium text-zinc-900">{plan.counts.exists} already have a task</b>
                {plan.counts.notApplicable > 0 ? ` · ${plan.counts.notApplicable} do not apply` : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {plan && view === 'pick' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-500 tabular-nums">{selectedReady.length} selected</span>
            <Button type="button" variant="outline" size="sm" onClick={useDefaults}>Use default assignees</Button>
            <div className="flex items-center gap-1">
              <Select value={bulkPerson} onValueChange={(v) => { setBulkPerson(v); assignSelected(v); }}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Assign selected to" /></SelectTrigger>
                <SelectContent>{team.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={split}>Split by workload</Button>
            {groups.length > 0 && (
              <div className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
                Group
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All groups</SelectItem>
                    {groups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="tff-card overflow-hidden">
            <div className="grid grid-cols-[28px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.1fr)] gap-3 items-center px-4 py-2 text-xs text-zinc-500 bg-zinc-50 border-b border-zinc-100">
              <Checkbox
                checked={visible.some((c) => c.status === 'ready') && visible.filter((c) => c.status === 'ready').every((c) => selected.has(c.client_id))}
                onCheckedChange={(v) => selectAllVisible(v === true)}
                aria-label="Select all clients"
              />
              <span>Client</span><span>Default assignee</span><span>Assign to</span>
            </div>
            <div className="divide-y divide-zinc-100 max-h-[28rem] overflow-y-auto">
              {visible.length === 0 && <p className="p-6 text-sm text-zinc-500 text-center">No clients are linked to this service.</p>}
              {visible.map((c) => {
                const ready = c.status === 'ready';
                return (
                  <div key={c.client_id} className={`grid grid-cols-[28px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.1fr)] gap-3 items-center px-4 py-2 text-sm ${ready ? '' : 'opacity-60'}`} data-testid={`deadline-row-${c.client_id}`}>
                    <Checkbox checked={ready && selected.has(c.client_id)} disabled={!ready} onCheckedChange={() => toggle(c.client_id)} aria-label={`Select ${c.business_name}`} />
                    <div className="min-w-0">
                      <div className="truncate text-zinc-900">{c.business_name}</div>
                      {c.group_name && <div className="text-xs text-zinc-500 truncate">{c.group_name}</div>}
                    </div>
                    {ready ? (
                      <>
                        <span className={`text-xs truncate ${c.default_assignee_id ? 'text-zinc-600' : 'text-amber-700'}`}>{c.default_assignee_id ? teamName(c.default_assignee_id) : 'Not set'}</span>
                        <Select value={assign[c.client_id] ?? ''} onValueChange={(v) => setAssign((p) => ({ ...p, [c.client_id]: v }))} disabled={!selected.has(c.client_id)}>
                          <SelectTrigger className={`h-8 text-xs ${selected.has(c.client_id) && !assign[c.client_id] ? 'border-amber-400' : ''}`} aria-label={`Assignee for ${c.business_name}`}>
                            <SelectValue placeholder="Choose" />
                          </SelectTrigger>
                          <SelectContent>{team.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </>
                    ) : (
                      <span className="col-span-2 text-xs text-zinc-600">{c.status === 'exists' ? 'Task exists' : c.reason ?? 'Does not apply'}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              {selectedReady.length === 0
                ? 'Select at least one client.'
                : missing.length > 0
                  ? `${missing.length} selected client${missing.length === 1 ? ' has' : 's have'} no assignee. Choose one, or clear the selection.`
                  : 'Every selected client has an assignee.'}
            </p>
            <Button type="button" disabled={selectedReady.length === 0 || missing.length > 0} onClick={() => setView('review')} data-testid="review-tasks">
              Review {selectedReady.length} task{selectedReady.length === 1 ? '' : 's'}
            </Button>
          </div>
        </>
      )}

      {plan && view === 'review' && (
        <div className="tff-card p-4 space-y-4" data-testid="review-step">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{selectedReady.length} task{selectedReady.length === 1 ? '' : 's'} for {sub?.name}, {plan.period_label}</h2>
            <p className="text-sm text-zinc-500">Each task gets the checklist from the service. You can change a task afterwards.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {Object.entries(selectedReady.reduce<Record<string, number>>((acc, c) => { const k = assign[c.client_id]; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {}))
              .map(([id, n]) => <span key={id} className="text-zinc-600"><b className="font-medium text-zinc-900 tabular-nums">{n}</b> to {teamName(id)}</span>)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            <div className="space-y-1.5">
              <Label htmlFor="deadline-due">Due date on the tasks</Label>
              <Input id="deadline-due" type="date" min={todayIST()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {canRememberDefaults && (
            <div className="flex items-center gap-2">
              <Checkbox id="remember-defaults" checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
              <Label htmlFor="remember-defaults" className="text-sm font-normal text-zinc-700 cursor-pointer">
                Remember these people as each client&apos;s default for this service
              </Label>
            </div>
          )}
          {plan.due_date && plan.due_date < todayIST() && dueDate === todayIST() && (
            <p className="text-sm text-zinc-500">The statutory date ({formatDateIST(plan.due_date)}) has passed, so the tasks are due today.</p>
          )}
          {!dueDate && <p className="text-sm text-red-600">Set a due date before creating.</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setView('pick')} disabled={creating}>Back</Button>
            <Button type="button" onClick={create} disabled={creating || !dueDate} data-testid="create-tasks">
              {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Create {selectedReady.length} task{selectedReady.length === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      )}

      {view === 'done' && result && (
        <div className="tff-card p-4 space-y-4" data-testid="result-step">
          <div className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <Check className="h-5 w-5 text-teal-600" /> {result.created.length} task{result.created.length === 1 ? '' : 's'} created
          </div>
          {result.defaults_saved > 0 && <p className="text-sm text-zinc-500">{result.defaults_saved} default assignee{result.defaults_saved === 1 ? '' : 's'} saved.</p>}
          {result.skipped.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-900">Skipped ({result.skipped.length})</h3>
              <ul className="text-sm text-zinc-600 list-disc pl-5">{result.skipped.map((s) => <li key={s.client_id}>{s.client_name}: {s.reason}</li>)}</ul>
            </div>
          )}
          {result.failed.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-700">Not created ({result.failed.length})</h3>
              <ul className="text-sm text-zinc-600 list-disc pl-5">{result.failed.map((s) => <li key={s.client_id}>{s.client_name ?? s.client_id}: {s.reason}</li>)}</ul>
            </div>
          )}
          <div className="flex gap-2">
            <Link href={`${basePath}/tasks`}><Button type="button">View tasks</Button></Link>
            <Button type="button" variant="outline" onClick={startOver}>Create more for this deadline</Button>
          </div>
        </div>
      )}

      {plan && (
        <ChangeDueDateDialog
          open={changeOpen}
          onOpenChange={setChangeOpen}
          subId={subId}
          periodKey={periodKey}
          current={plan.due_date}
          onChanged={() => void loadPlan(true)}
        />
      )}
    </div>
  );
}

function ChangeDueDateDialog({
  open, onOpenChange, subId, periodKey, current, onChanged,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subId: string;
  periodKey: string;
  current: string | null;
  onChanged: () => void;
}) {
  const [date, setDate] = useState(current ?? '');
  const [note, setNote] = useState('');
  const [move, setMove] = useState(true);
  const [pending, start] = useTransition();

  useEffect(() => { if (open) { setDate(current ?? ''); setNote(''); setMove(true); } }, [open, current]);

  function save() {
    if (!date) { toast.error('Choose a date'); return; }
    start(async () => {
      const r = await changeDeadlineDueDateAction({ sub_service_id: subId, period_key: periodKey, due_date: date, note: note || null, move_open_tasks: move });
      if (!r.success) { toast.error(r.error); return; }
      toast.success(move ? `Due date changed. ${r.data.tasks_moved} open task${r.data.tasks_moved === 1 ? '' : 's'} moved.` : 'Due date changed');
      onOpenChange(false);
      onChanged();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Change the due date</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-due">New due date</Label>
            <Input id="new-due" type="date" min={todayIST()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due-note">Reason (optional)</Label>
            <Textarea id="due-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example, extended by notification" maxLength={300} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="move-open-tasks" checked={move} onCheckedChange={(v) => setMove(v === true)} />
            <Label htmlFor="move-open-tasks" className="text-sm font-normal text-zinc-700 cursor-pointer">
              Also move the due date on open tasks for this deadline that you can see
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button onClick={save} disabled={pending}>Save date</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
