'use client';
import { useEffect, useState, useTransition, useRef } from 'react';
import { useAutoSaveState } from '@/lib/hooks/use-auto-save';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ClientSearchCombobox } from '@/components/clients/client-search-combobox';
import { createTaskAction } from '@/lib/actions/tasks';
import { linkSubServiceAction } from '@/lib/actions/services';
import { toast } from 'sonner';
import { Plus, ChevronDown } from 'lucide-react';
import { todayIST, buildTaskTitle } from '@/lib/utils';

interface Props {
  /** Pre-loaded clients for synchronous title generation fallback. When omitted, async search is used. */
  clients?: { id: string; business_name: string; pan?: string | null }[];
  team: { id: string; full_name: string }[];
  allSubServices?: { id: string; name: string; code?: string | null }[];
  defaultClientId?: string;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline';
  mode?: 'admin' | 'team';
  currentUserId?: string;
}

function getTomorrowIST(): string {
  const today = todayIST();
  const [y, m, d] = today.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default function NewTaskDialog({ clients = [], team, allSubServices = [], defaultClientId, triggerLabel = 'New task', triggerVariant = 'default', mode = 'admin', currentUserId }: Props) {
  const isAdmin = mode === 'admin';
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showMore, setShowMore] = useState(false);
  const [clientSubServices, setClientSubServices] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<{ id: string; business_name: string; pan?: string | null } | null>(null);
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [linkingSubService, setLinkingSubService] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    client_id: defaultClientId ?? '',
    sub_service_id: '',
    task_template_id: '',
    title: '',
    description: '',
    priority: 'medium' as const,
    assigned_to: currentUserId ?? '',
    due_date: getTomorrowIST(),
    period_year: '',
    period_month: '',
    period_quarter: '',
  });
  // Keep auto-generated title in a ref so we can pass it to createTaskAction
  // without showing an input field
  const [autoTitle, setAutoTitle] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { clearAutoSave } = useAutoSaveState('new-task', f, setF);

  // Listen for command palette /task shortcut
  useEffect(() => {
    function handle(e: Event) { setOpen(true); }
    window.addEventListener('cmdk:new-task', handle);
    return () => window.removeEventListener('cmdk:new-task', handle);
  }, []);

  function set<K extends keyof typeof f>(k: K, v: any) { setF((p) => ({ ...p, [k]: v })); }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, f]);

  // Auto-generate title when client + sub-service or period changes
  useEffect(() => {
    if (!f.client_id || !f.sub_service_id) return;
    const clientName = selectedClient?.business_name ?? clients.find((c) => c.id === f.client_id)?.business_name ?? '';
    const subName = clientSubServices.find((cs: any) => cs.sub_service_id === f.sub_service_id)?.sub_services?.name ?? '';
    if (clientName && subName) {
      const newTitle = buildTaskTitle({
        subServiceName: subName,
        clientName,
        periodYear: f.period_year ? parseInt(f.period_year, 10) : null,
        periodMonth: f.period_month ? parseInt(f.period_month, 10) : null,
        periodQuarter: f.period_quarter ? parseInt(f.period_quarter, 10) : null,
      });
      setAutoTitle(newTitle);
    }
  }, [f.client_id, f.sub_service_id, f.period_year, f.period_month, f.period_quarter, clientSubServices, clients, selectedClient]);

  // Load this client's sub-services and basic info when client changes
  useEffect(() => {
    if (!f.client_id) { setClientSubServices([]); setSelectedClient(null); return; }
    fetch(`/api/clients/${f.client_id}/sub-services`)
      .then((r) => r.json())
      .then((j) => {
        setClientSubServices(j.items ?? []);
        if (j.client) setSelectedClient(j.client);
      })
      .catch(() => {
        setClientSubServices([]);
        setSelectedClient(null);
      });
  }, [f.client_id]);

  const linkedSubServiceIds = new Set(clientSubServices.map((cs: any) => cs.sub_service_id));
  const subServiceOptions = allSubServices.map((ss) => {
    const isLinked = linkedSubServiceIds.has(ss.id);
    const linkedName = clientSubServices.find((cs: any) => cs.sub_service_id === ss.id)?.sub_services?.name ?? ss.name;
    return {
      value: ss.id,
      label: isLinked ? linkedName : `${ss.name} (Link & select)`,
      searchString: `${ss.name} ${ss.code ?? ''}`.toLowerCase(),
    };
  }).sort((a, b) => {
    const aLinked = linkedSubServiceIds.has(a.value);
    const bLinked = linkedSubServiceIds.has(b.value);
    return (bLinked ? 1 : 0) - (aLinked ? 1 : 0);
  });

  async function handleSubServiceChange(subServiceId: string) {
    if (!subServiceId) {
      set('sub_service_id', '');
      return;
    }
    const isLinked = linkedSubServiceIds.has(subServiceId);
    if (isLinked) {
      set('sub_service_id', subServiceId);
      return;
    }
    // Auto-link unlinked sub-service
    setLinkingSubService(true);
    const r = await linkSubServiceAction({ client_id: f.client_id, sub_service_id: subServiceId });
    setLinkingSubService(false);
    if (r.success) {
      toast.success('Sub-service linked to client');
      // Refresh linked sub-services
      fetch(`/api/clients/${f.client_id}/sub-services`).then((res) => res.json()).then((j) => setClientSubServices(j.items ?? [])).catch(() => {});
      set('sub_service_id', subServiceId);
    } else if (r.code === 'DUPLICATE') {
      set('sub_service_id', subServiceId);
    } else {
      toast.error(r.error ?? 'Failed to link sub-service');
    }
  }

  // Load task templates when sub-service changes
  useEffect(() => {
    if (!f.sub_service_id) { setTaskTemplates([]); setF((p) => ({ ...p, task_template_id: '' })); return; }
    fetch(`/api/task-templates?sub_service_id=${f.sub_service_id}`).then((r) => r.json()).then((j) => setTaskTemplates(j.items ?? [])).catch(() => setTaskTemplates([]));
  }, [f.sub_service_id]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!f.client_id) next.client_id = 'Pick a client';
    if (!autoTitle.trim()) next.title = 'Title could not be generated. Please select client and sub-service.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function save() {
    if (!validate()) return;
    startTransition(async () => {
      const payload: any = {
        client_id: f.client_id,
        title: autoTitle.trim(),
        description: f.description || undefined,
        priority: f.priority,
        assigned_to: f.assigned_to || undefined,
        due_date: f.due_date || undefined,
        sub_service_id: f.sub_service_id || undefined,
        task_template_id: f.task_template_id || undefined,
        period_year: f.period_year ? parseInt(f.period_year, 10) : undefined,
        period_month: f.period_month ? parseInt(f.period_month, 10) : undefined,
        period_quarter: f.period_quarter ? parseInt(f.period_quarter, 10) : undefined,
        is_billable: false,
      };
      const r = await createTaskAction(payload);
      if (r.success) {
        toast.success('Task created');
        setOpen(false);
        setF({ client_id: defaultClientId ?? '', sub_service_id: '', task_template_id: '', title: '', description: '', priority: 'medium', assigned_to: currentUserId ?? '', due_date: getTomorrowIST(), period_year: '', period_month: '', period_quarter: '' });
        setAutoTitle('');
        clearAutoSave();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} data-testid="new-task-button"><Plus className="h-4 w-4" /> {triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
        <form className="space-y-3">
          {!defaultClientId && (
            <div className="space-y-2">
              <Label>Client *</Label>
              <ClientSearchCombobox
                async
                value={f.client_id}
                onChange={(v) => { setF((p) => ({ ...p, client_id: v, sub_service_id: '', task_template_id: '' })); setErrors((e) => { const copy = { ...e }; delete copy.client_id; return copy; }); }}
                placeholder="Choose a client..."
                searchPlaceholder="Search by name or PAN..."
                className={errors.client_id ? 'border-red-500' : ''}
              />
              {errors.client_id && <p className="text-xs text-red-600">{errors.client_id}</p>}
            </div>
          )}

          {/* Sub-service picker — all services, auto-link if needed */}
          {f.client_id && allSubServices.length > 0 && (
            <div className="space-y-2">
              <Label>Sub-service</Label>
              <SearchableSelect
                options={subServiceOptions}
                value={f.sub_service_id}
                onChange={handleSubServiceChange}
                placeholder={linkingSubService ? 'Linking sub-service…' : 'Choose a sub-service…'}
                searchPlaceholder="Search sub-services…"
                disabled={linkingSubService}
              />
              {clientSubServices.length === 0 && !linkingSubService && (
                <p className="text-xs text-zinc-500">This client has no linked sub-services yet. Pick one above to auto-link.</p>
              )}
            </div>
          )}

          {/* Template picker — shown when sub-service selected */}
          {f.sub_service_id && (
            <div className="space-y-2">
              <Label>Task template</Label>
              {taskTemplates.length > 0 ? (
                <Select value={f.task_template_id} onValueChange={(v) => set('task_template_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select template (optional)…" /></SelectTrigger>
                  <SelectContent>
                    {taskTemplates.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.title} ({t.frequency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
                  No templates for this sub-service.
                </div>
              )}
            </div>
          )}

          {autoTitle && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-xs text-zinc-500">Task name</p>
              <p className="text-sm font-medium text-zinc-900">{autoTitle}</p>
            </div>
          )}
          {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={f.due_date} onChange={(e) => set('due_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={f.assigned_to} onValueChange={(v) => set('assigned_to', v)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>{team.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Period year</Label><Input type="number" min={2000} max={2100} value={f.period_year} onChange={(e) => set('period_year', e.target.value)} placeholder="2026" /></div>
            <div className="space-y-2"><Label>Period month</Label><Input type="number" min={1} max={12} value={f.period_month} onChange={(e) => set('period_month', e.target.value)} placeholder="1-12" /></div>
            <div className="space-y-2"><Label>Quarter</Label><Input type="number" min={1} max={4} value={f.period_quarter} onChange={(e) => set('period_quarter', e.target.value)} placeholder="1-4" /></div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-teal-700"
            onClick={() => setShowMore((p) => !p)}
          >
            {showMore ? 'Fewer options ▲' : 'More options ▼'}
            <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </Button>

          {showMore && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
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
              </div>
            </div>
          )}
        </form>
        <DialogFooter><Button onClick={save} disabled={pending} data-testid="task-save">{pending ? 'Creating...' : 'Create task'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
