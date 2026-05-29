'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { bulkCreateTasksAction } from '@/lib/actions/tasks';

interface Client {
  id: string;
  business_name: string;
}

interface TeamMember {
  id: string;
  full_name: string;
}

interface Props {
  subServiceId: string;
  subServiceName: string;
  clients: Client[];
  team: TeamMember[];
}

export default function BulkCreateTasksForm({ subServiceId, subServiceName, clients, team }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set(clients.map((c) => c.id)));
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [periodYear, setPeriodYear] = useState(String(new Date().getFullYear()));
  const [periodMonth, setPeriodMonth] = useState('');
  const [periodQuarter, setPeriodQuarter] = useState('');
  const [priority, setPriority] = useState('medium');

  const allSelected = selectedClientIds.size === clients.length;

  function toggleAll() {
    if (allSelected) setSelectedClientIds(new Set());
    else setSelectedClientIds(new Set(clients.map((c) => c.id)));
  }

  function toggleClient(id: string) {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    if (selectedClientIds.size === 0) { toast.error('Select at least one client'); return; }
    if (!dueDate) { toast.error('Due date is required'); return; }
    startTransition(async () => {
      const r = await bulkCreateTasksAction({
        client_ids: Array.from(selectedClientIds),
        sub_service_id: subServiceId,
        assigned_to: assignedTo || null,
        due_date: dueDate,
        priority: priority as any,
        period_year: parseInt(periodYear, 10),
        period_month: periodMonth ? parseInt(periodMonth, 10) : null,
        period_quarter: periodQuarter ? parseInt(periodQuarter, 10) : null,
      });
      if (!r.success) {
        toast.error(r.error);
      } else {
        toast.success(`Created ${r.data?.created ?? 0} tasks`);
        router.push('/admin/tasks');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Clients ({selectedClientIds.size} selected)</Label>
          <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={toggleAll}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </Button>
        </div>
        <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-lg divide-y divide-zinc-100">
          {clients.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50">
              <Checkbox checked={selectedClientIds.has(c.id)} onCheckedChange={() => toggleClient(c.id)} />
              <span className="text-xs text-zinc-700 truncate">{c.business_name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Due date *</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Assignee</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              {team.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Year *</Label>
          <Input type="number" min={2000} max={2100} value={periodYear} onChange={(e) => setPeriodYear(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Month</Label>
          <Input type="number" min={1} max={12} value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} className="h-8 text-xs" placeholder="1-12" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Quarter</Label>
          <Input type="number" min={1} max={4} value={periodQuarter} onChange={(e) => setPeriodQuarter(e.target.value)} className="h-8 text-xs" placeholder="1-4" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Priority</Label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={submit} disabled={pending || selectedClientIds.size === 0} className="w-full">
        {pending ? 'Creating...' : `Create ${selectedClientIds.size} task${selectedClientIds.size !== 1 ? 's' : ''}`}
      </Button>

      <p className="text-[10px] text-zinc-400">
        Task names will be: <span className="font-mono">Client Name — {subServiceName} — {periodMonth || '?'}/{periodYear}</span>
      </p>
    </div>
  );
}
