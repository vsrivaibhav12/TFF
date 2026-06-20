'use client';
import { useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { addWorkDoneAction } from '@/lib/actions/work-done';
import { displayTaskName } from '@/lib/utils';
import { toast } from 'sonner';

const schema = z.object({
  client_id: z.string().optional(),
  task_id: z.string().optional(),
  work_date: z.string(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  duration_minutes: z.coerce.number().int().positive(),
  note: z.string().min(3, 'Please describe what you did'),
});

export default function WorkDoneForm({ clients, tasks }: { clients: any[]; tasks: any[] }) {
  const [pending, startTransition] = useTransition();
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      work_date: new Date().toISOString().slice(0, 10),
      start_time: '09:00',
      end_time: '17:00',
      duration_minutes: 480,
      note: '',
    },
  });

  const taskClientMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of tasks) {
      if (t.client_id) map[t.id] = t.client_id;
    }
    return map;
  }, [tasks]);

  const clientTaskMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const t of tasks) {
      if (t.client_id) {
        if (!map[t.client_id]) map[t.client_id] = [];
        map[t.client_id].push(t);
      }
    }
    return map;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (!selectedClientId) return tasks;
    return clientTaskMap[selectedClientId] ?? [];
  }, [selectedClientId, clientTaskMap, tasks]);

  function computeMinutes() {
    const start = form.getValues('start_time');
    const end = form.getValues('end_time');
    if (start && end) {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins > 0) form.setValue('duration_minutes', mins);
    }
  }

  function handleTaskChange(taskId: string) {
    setSelectedTaskId(taskId);
    form.setValue('task_id', taskId);
    const clientId = taskClientMap[taskId];
    if (clientId) {
      setSelectedClientId(clientId);
      form.setValue('client_id', clientId);
    }
  }

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId);
    form.setValue('client_id', clientId);
    // If current task doesn't belong to this client, clear it
    if (selectedTaskId && taskClientMap[selectedTaskId] !== clientId) {
      setSelectedTaskId(undefined);
      form.setValue('task_id', undefined);
    }
  }

  async function onSubmit(data: z.infer<typeof schema>) {
    startTransition(async () => {
      const work_date = data.work_date;
      const started_at = data.start_time ? `${work_date}T${data.start_time}:00+05:30` : undefined;
      const ended_at = data.end_time ? `${work_date}T${data.end_time}:00+05:30` : undefined;
      const r = await addWorkDoneAction({
        client_id: data.client_id,
        task_id: data.task_id,
        work_date,
        duration_minutes: data.duration_minutes,
        note: data.note,
        started_at,
        ended_at,
      });
      if (r.success) {
        toast.success('Work log saved');
        setSelectedClientId(undefined);
        setSelectedTaskId(undefined);
        form.reset({
          work_date: new Date().toISOString().slice(0, 10),
          start_time: '09:00',
          end_time: '17:00',
          duration_minutes: 480,
          note: '',
        });
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 tff-card tff-card-pad">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" {...form.register('work_date')} />
        </div>
        <div className="space-y-2">
          <Label>Minutes</Label>
          <Input type="number" {...form.register('duration_minutes')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start time</Label>
          <Input type="time" {...form.register('start_time')} onBlur={computeMinutes} />
        </div>
        <div className="space-y-2">
          <Label>End time</Label>
          <Input type="time" {...form.register('end_time')} onBlur={computeMinutes} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Client (optional)</Label>
          <SearchableSelect
            options={[
              { value: '__none__', label: 'No client', searchString: 'no client' },
              ...clients.map((c) => ({
                value: c.id,
                label: c.pan ? `${c.business_name} (${c.pan})` : c.business_name,
                searchString: `${c.business_name} ${c.pan ?? ''}`.toLowerCase(),
              })),
            ]}
            value={selectedClientId || '__none__'}
            onChange={(v) => handleClientChange(v === '__none__' ? '' : v)}
            placeholder="Select client"
            searchPlaceholder="Search by name or PAN..."
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label>Task (optional)</Label>
          <SearchableSelect
            options={[
              { value: '__none__', label: 'No task', searchString: 'no task' },
              ...filteredTasks.map((t) => ({
                value: t.id,
                label: displayTaskName(t),
                searchString: displayTaskName(t).toLowerCase(),
              })),
            ]}
            value={selectedTaskId || '__none__'}
            onChange={(v) => handleTaskChange(v === '__none__' ? '' : v)}
            placeholder={filteredTasks.length === 0 ? 'No tasks' : 'Select task'}
            searchPlaceholder="Search tasks..."
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Note</Label>
        <Textarea {...form.register('note')} placeholder="Summarize your work..." />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving...' : 'Log work'}
      </Button>
    </form>
  );
}
