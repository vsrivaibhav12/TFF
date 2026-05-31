'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { updateWorkDoneAction, deleteWorkDoneAction } from '@/lib/actions/work-done';
import { useConfirm } from '@/components/ui/use-confirm';

interface WorkDoneEntry {
  id: string;
  user_id: string;
  client_id: string | null;
  task_id: string | null;
  work_date: string;
  duration_minutes: number;
  note: string | null;
  started_at: string | null;
  ended_at: string | null;
  tasks?: { title: string } | null;
  clients?: { business_name: string } | null;
}

export function WorkDoneRowActions({
  entry,
  canEdit,
  clients,
  tasks,
}: {
  entry: WorkDoneEntry;
  canEdit: boolean;
  clients: Array<{ id: string; business_name: string }>;
  tasks: Array<{ id: string; title: string; client_id?: string | null }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [ConfirmDialog, confirm] = useConfirm();

  async function onDelete() {
    const ok = await confirm({ title: 'Delete Entry', description: 'Delete this work log entry?' });
    if (!ok) return;
    startTransition(async () => {
      const r = await deleteWorkDoneAction(entry.id);
      if (r.success) {
        toast.success('Work log deleted');
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  if (!canEdit) return null;

  return (
    <>
      <ConfirmDialog />
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing(true)} disabled={pending}>
          <Pencil className="h-3.5 w-3.5 text-zinc-400" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDelete} disabled={pending}>
          <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
        </Button>
      </div>
      {editing && (
        <WorkDoneEditDialog
          entry={entry}
          clients={clients}
          tasks={tasks}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

function WorkDoneEditDialog({
  entry,
  clients,
  tasks,
  onClose,
}: {
  entry: WorkDoneEntry;
  clients: Array<{ id: string; business_name: string }>;
  tasks: Array<{ id: string; title: string; client_id?: string | null }>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    work_date: entry.work_date,
    duration_minutes: entry.duration_minutes,
    note: entry.note ?? '',
    client_id: entry.client_id ?? '',
    task_id: entry.task_id ?? '',
  });

  const filteredTasks = tasks.filter((t) => !f.client_id || t.client_id === f.client_id);

  function save() {
    startTransition(async () => {
      const r = await updateWorkDoneAction({
        id: entry.id,
        work_date: f.work_date,
        duration_minutes: f.duration_minutes,
        note: f.note,
        client_id: f.client_id || null,
        task_id: f.task_id || null,
      });
      if (r.success) {
        toast.success('Work log updated');
        onClose();
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit work log</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={f.work_date} onChange={(e) => setF({ ...f, work_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Duration (min)</Label><Input type="number" value={f.duration_minutes} onChange={(e) => setF({ ...f, duration_minutes: Number(e.target.value) })} /></div>
          </div>
          <div className="space-y-1"><Label>Note</Label><Textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Client</Label>
              <Select value={f.client_id || '__none__'} onValueChange={(v) => setF({ ...f, client_id: v === '__none__' ? '' : v, task_id: '' })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Task</Label>
              <Select value={f.task_id || '__none__'} onValueChange={(v) => setF({ ...f, task_id: v === '__none__' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {filteredTasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={pending}>{pending ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Saving…</> : 'Save changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
