'use client';
import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRolePrefix } from '@/lib/hooks/use-role-prefix';
import { buildTaskTitle } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { createTaskAction } from '@/lib/actions/tasks';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';

interface Props {
  clients: { id: string; business_name: string; group_id: string | null }[];
  team: { id: string; full_name: string }[];
  groups: { id: string; name: string }[];
  templates?: { id: string; title: string; description: string | null }[];
  initialSubServiceId?: string;
  subServiceName?: string;
}

export default function BulkTaskForm({ clients, team, groups, templates = [], initialSubServiceId, subServiceName }: Props) {
  const router = useRouter();
  const prefix = useRolePrefix();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<'clients' | 'details' | 'assignees' | 'preview'>('clients');

  // 1. Client selection
  const [clientSearch, setClientSearch] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());

  // 2. Task details
  const [f, setF] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    due_date: '',
    period_year: '',
    period_month: '',
    period_quarter: '',
    is_billable: false,
    bill_reference: '',
    bill_amount: '',
    sub_service_id: initialSubServiceId || '',
    task_template_id: '',
  });
  const [autoTitle, setAutoTitle] = useState('');

  // Auto-generate title from template selection or sub-service + period
  useEffect(() => {
    if (f.task_template_id) {
      const tpl = templates.find((t) => t.id === f.task_template_id);
      if (tpl && tpl.title) {
        setAutoTitle(tpl.title);
        return;
      }
    }
    // Auto-generate title from sub-service name + period (bulk = no client name)
    if (subServiceName) {
      const newTitle = buildTaskTitle({
        subServiceName,
        periodYear: f.period_year ? parseInt(f.period_year, 10) : null,
        periodMonth: f.period_month ? parseInt(f.period_month, 10) : null,
        periodQuarter: f.period_quarter ? parseInt(f.period_quarter, 10) : null,
      });
      setAutoTitle(newTitle);
    }
  }, [f.task_template_id, templates, subServiceName, f.period_year, f.period_month, f.period_quarter]);

  // 3. Assignees
  const [assigneeMap, setAssigneeMap] = useState<Record<string, { assignee?: string; reviewer?: string }>>({});
  const [selectedForAssign, setSelectedForAssign] = useState<Set<string>>(new Set());
  const [bulkAssignee, setBulkAssignee] = useState<string>('');
  const [bulkReviewer, setBulkReviewer] = useState<string>('');

  const filteredClients = clients.filter((c) => {
    if (groupFilter !== 'all' && c.group_id !== groupFilter) return false;
    if (clientSearch.trim() && !c.business_name.toLowerCase().includes(clientSearch.toLowerCase())) return false;
    return true;
  });

  const allFilteredSelected = filteredClients.length > 0 && filteredClients.every((c) => selectedClients.has(c.id));

  function toggleClient(id: string) {
    const ns = new Set(selectedClients);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setSelectedClients(ns);
  }

  function toggleAllFiltered() {
    const ns = new Set(selectedClients);
    if (allFilteredSelected) {
      filteredClients.forEach((c) => ns.delete(c.id));
    } else {
      filteredClients.forEach((c) => ns.add(c.id));
    }
    setSelectedClients(ns);
  }

  function set<K extends keyof typeof f>(k: K, v: any) { setF((p) => ({ ...p, [k]: v })); }

  // Assignees step helpers
  const selectedClientsList = useMemo(() => {
    return clients.filter((c) => selectedClients.has(c.id));
  }, [clients, selectedClients]);

  const allSelectedForAssign = selectedClientsList.length > 0 && selectedForAssign.size === selectedClientsList.length;

  function toggleAssignRow(id: string) {
    const ns = new Set(selectedForAssign);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setSelectedForAssign(ns);
  }

  function toggleAllAssignRows() {
    if (allSelectedForAssign) setSelectedForAssign(new Set());
    else setSelectedForAssign(new Set(selectedClientsList.map((c) => c.id)));
  }

  function applyBulkAssignees() {
    if (selectedForAssign.size === 0) return;
    setAssigneeMap((prev) => {
      const next = { ...prev };
      selectedForAssign.forEach((id) => {
        next[id] = {
          ...next[id],
          assignee: bulkAssignee || next[id]?.assignee,
          reviewer: bulkReviewer || next[id]?.reviewer,
        };
      });
      return next;
    });
    toast.success(`Applied to ${selectedForAssign.size} clients`);
    setSelectedForAssign(new Set()); // clear selection after apply
    setBulkAssignee('');
    setBulkReviewer('');
  }

  function setSingleAssignee(clientId: string, field: 'assignee' | 'reviewer', val: string) {
    setAssigneeMap((prev) => ({
      ...prev,
      [clientId]: { ...prev[clientId], [field]: val === 'unassigned' ? undefined : val }
    }));
  }

  const [progress, setProgress] = useState({ done: 0, total: 0 });

  function doCreate() {
    if (selectedClients.size === 0) { toast.error('Select at least one client'); return; }
    if (!autoTitle.trim()) { toast.error('Task name could not be generated'); return; }
    if (!f.due_date) { toast.error('Due date is required'); return; }

    startTransition(async () => {
      setProgress({ done: 0, total: selectedClients.size });
      let success = 0;
      let failed = 0;

      for (const clientId of selectedClients) {
        const mapping = assigneeMap[clientId] || {};
        const payload: any = {
          client_id: clientId,
          title: autoTitle.trim(),
          description: f.description || undefined,
          priority: f.priority,
          assigned_to: mapping.assignee || undefined,
          reviewer_id: mapping.reviewer || undefined,
          due_date: f.due_date,
          sub_service_id: f.sub_service_id || undefined,
          task_template_id: (f.task_template_id && f.task_template_id !== 'unassigned') ? f.task_template_id : undefined,
          period_year: f.period_year ? parseInt(f.period_year, 10) : undefined,
          period_month: f.period_month ? parseInt(f.period_month, 10) : undefined,
          period_quarter: f.period_quarter ? parseInt(f.period_quarter, 10) : undefined,
          is_billable: f.is_billable,
          bill_reference: f.bill_reference || undefined,
          bill_amount: f.bill_amount ? parseFloat(f.bill_amount) : undefined,
        };

        const r = await createTaskAction(payload);
        if (r.success) success++;
        else failed++;

        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }

      toast.success(`Created ${success} tasks${failed > 0 ? `, ${failed} failed` : ''}`);
      if (success > 0) {
        router.push(`${prefix}/tasks`);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
        {(['clients', 'details', 'assignees', 'preview'] as const).map((s, i) => (
          <button
            key={s}
            onClick={() => {
              if (s === 'assignees' && step === 'clients') setStep('details');
              else if (s === 'preview' && (step === 'clients' || step === 'details')) setStep('assignees');
              else setStep(s);
            }}
            className={`px-3 py-1.5 rounded-md border whitespace-nowrap ${step === s ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}
          >
            {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {step === 'clients' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <Label className="sr-only">Search clients</Label>
              <Input
                placeholder="Search clients..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Filter by group</Label>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All groups" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All groups</SelectItem>
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm text-zinc-500 ml-auto">{selectedClients.size} selected</span>
          </div>

          <div className="tff-card overflow-hidden">
            <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200 flex items-center gap-2">
              <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAllFiltered} />
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Select all visible</span>
            </div>
            <div className="max-h-[28rem] overflow-y-auto">
              {filteredClients.map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 cursor-pointer border-b border-zinc-100 last:border-0">
                  <Checkbox checked={selectedClients.has(c.id)} onCheckedChange={() => toggleClient(c.id)} />
                  <span className="text-sm text-zinc-900">{c.business_name}</span>
                  {c.group_id && (
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 ml-auto">
                      {groups.find((g) => g.id === c.group_id)?.name}
                    </span>
                  )}
                </label>
              ))}
              {filteredClients.length === 0 && (
                <p className="text-sm text-zinc-400 px-4 py-6 text-center">No clients in this group</p>
              )}
            </div>
          </div>

          <Button onClick={() => setStep('details')} disabled={selectedClients.size === 0}>
            Next: Task details
          </Button>
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-4 max-w-xl">
          {autoTitle && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-xs text-zinc-500">Task name</p>
              <p className="text-sm font-medium text-zinc-900">{autoTitle}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={f.priority} onValueChange={(v) => set('priority', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">low</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="high">high</SelectItem>
                  <SelectItem value="urgent">urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Due date *</Label><DatePicker value={f.due_date} onChange={(v) => set('due_date', v)} /></div>
          </div>

          {templates.length > 0 && (
            <div className="space-y-2 border-t border-zinc-100 pt-3 mt-1">
              <Label>Allocate Task Template / SOP</Label>
              <Select value={f.task_template_id} onValueChange={(v) => set('task_template_id', v)}>
                <SelectTrigger><SelectValue placeholder="No template selected" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">None</SelectItem>
                  {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zinc-500">Selecting a template will copy its SOP steps to all created tasks.</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 border-t border-zinc-100 pt-3 mt-1">
            <div className="space-y-2"><Label>Period year</Label><Input type="number" min={2000} max={2100} value={f.period_year} onChange={(e) => set('period_year', e.target.value)} placeholder="2026" /></div>
            <div className="space-y-2"><Label>Period month</Label><Input type="number" min={1} max={12} value={f.period_month} onChange={(e) => set('period_month', e.target.value)} placeholder="1-12" /></div>
            <div className="space-y-2"><Label>Quarter</Label><Input type="number" min={1} max={4} value={f.period_quarter} onChange={(e) => set('period_quarter', e.target.value)} placeholder="1-4" /></div>
          </div>
          <div className="flex items-center gap-3 border-t border-zinc-100 pt-3 mt-1">
            <Checkbox id="billable" checked={f.is_billable} onCheckedChange={(v) => set('is_billable', v === true)} />
            <Label htmlFor="billable" className="cursor-pointer">Billable</Label>
            {f.is_billable && (
              <>
                <Input className="flex-1" value={f.bill_reference} onChange={(e) => set('bill_reference', e.target.value)} placeholder="Bill reference" />
                <Input type="number" className="w-28" value={f.bill_amount} onChange={(e) => set('bill_amount', e.target.value)} placeholder="Amount" />
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep('clients')}>Back</Button>
            <Button onClick={() => setStep('assignees')}>Next: Assignees</Button>
          </div>
        </div>
      )}

      {step === 'assignees' && (
        <div className="space-y-4">
          <div className="tff-card p-4 space-y-4 bg-zinc-50 border-dashed border-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-500" />
              <h3 className="text-sm font-semibold">Bulk apply assignees</h3>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5 w-48">
                <Label className="text-xs text-zinc-500">Assignee</Label>
                <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
                  <SelectTrigger className="h-8 text-sm bg-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{team.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 w-48">
                <Label className="text-xs text-zinc-500">Reviewer</Label>
                <Select value={bulkReviewer} onValueChange={setBulkReviewer}>
                  <SelectTrigger className="h-8 text-sm bg-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{team.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button size="sm" className="h-8" disabled={selectedForAssign.size === 0 || (!bulkAssignee && !bulkReviewer)} onClick={applyBulkAssignees}>
                Apply to {selectedForAssign.size} selected
              </Button>
            </div>
          </div>

          <div className="tff-card overflow-hidden">
            <div className="bg-white border-b border-zinc-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 text-xs text-zinc-500 border-b border-zinc-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2 w-10 text-center"><Checkbox checked={allSelectedForAssign} onCheckedChange={toggleAllAssignRows} /></th>
                    <th className="px-4 py-2">Client Task</th>
                    <th className="px-4 py-2 w-48">Assignee</th>
                    <th className="px-4 py-2 w-48">Reviewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 max-h-[25rem] overflow-y-auto">
                  {selectedClientsList.map((c) => {
                    const currentMap = assigneeMap[c.id] || {};
                    return (
                      <tr key={c.id} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-2 text-center">
                          <Checkbox checked={selectedForAssign.has(c.id)} onCheckedChange={() => toggleAssignRow(c.id)} />
                        </td>
                        <td className="px-4 py-2 font-medium text-zinc-900">{c.business_name}</td>
                        <td className="px-4 py-2">
                          <Select value={currentMap.assignee || 'unassigned'} onValueChange={(v) => setSingleAssignee(c.id, 'assignee', v)}>
                            <SelectTrigger className="h-8 text-xs border-transparent hover:border-zinc-200 bg-transparent hover:bg-white shadow-none">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned" className="text-zinc-400">Unassigned</SelectItem>
                              {team.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2">
                          <Select value={currentMap.reviewer || 'unassigned'} onValueChange={(v) => setSingleAssignee(c.id, 'reviewer', v)}>
                            <SelectTrigger className="h-8 text-xs border-transparent hover:border-zinc-200 bg-transparent hover:bg-white shadow-none">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned" className="text-zinc-400">None</SelectItem>
                              {team.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep('details')}>Back</Button>
            <Button onClick={() => setStep('preview')}>Next: Preview</Button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="tff-card tff-card-pad space-y-3">
            <h3 className="font-semibold text-zinc-900">Preview</h3>
            <div className="text-sm text-zinc-600 space-y-1">
              <p><strong>Total Tasks:</strong> {selectedClients.size}</p>
              <p><strong>Task name:</strong> {autoTitle || '—'}</p>
              <p><strong>Due:</strong> {f.due_date || '—'}</p>
              <p><strong>Priority:</strong> {f.priority}</p>
              <p><strong>Template:</strong> {f.task_template_id && f.task_template_id !== 'unassigned' ? templates.find(t => t.id === f.task_template_id)?.title || 'Yes' : 'None'}</p>
              <p><strong>Billable:</strong> {f.is_billable ? `Yes · ${f.bill_reference || 'No ref'} · ₹${f.bill_amount || 0}` : 'No'}</p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2">Assignment Overview</h4>
              <div className="max-h-32 overflow-y-auto text-xs text-zinc-500 space-y-1">
                {selectedClientsList.slice(0, 5).map(c => {
                  const m = assigneeMap[c.id];
                  const aName = m?.assignee ? team.find(t => t.id === m.assignee)?.full_name : 'Unassigned';
                  return <div key={c.id} className="flex justify-between border-b border-zinc-50 pb-1"><span className="truncate pr-2">{c.business_name}</span><span className="font-medium shrink-0">{aName}</span></div>;
                })}
                {selectedClientsList.length > 5 && <div className="pt-1 italic">...and {selectedClientsList.length - 5} more</div>}
              </div>
            </div>

            {pending && (
              <div className="space-y-2 mt-4 pt-4 border-t border-zinc-100">
                <div className="flex items-center gap-2 text-sm text-teal-700 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating {progress.done} of {progress.total} tasks…
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setStep('assignees')} disabled={pending}>Back</Button>
            <Button onClick={doCreate} disabled={pending}>
              {pending ? 'Creating…' : `Confirm & Create ${selectedClients.size} tasks`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
