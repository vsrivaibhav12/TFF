'use client';
import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { requestPermissionAction } from '@/lib/actions/permission';
import { toast } from 'sonner';

export default function PermissionForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({ request_date: '', from_time: '', to_time: '', reason: '' });

  function save() {
    if (!f.request_date) {
      toast.error('Pick a date');
      return;
    }
    startTransition(async () => {
      const r = await requestPermissionAction(f as any);
      if (r.success) {
        toast.success('Permission requested');
        setOpen(false);
        setF({ request_date: '', from_time: '', to_time: '', reason: '' });
      } else toast.error(r.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="permission-new" variant="outline">
          Request permission
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request permission / OD</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={f.request_date} onChange={(e) => setF({ ...f, request_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>From time</Label>
              <Input type="time" value={f.from_time} onChange={(e) => setF({ ...f, from_time: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>To time</Label>
              <Input type="time" value={f.to_time} onChange={(e) => setF({ ...f, to_time: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea rows={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={pending} data-testid="permission-submit">
            {pending ? 'Submitting…' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
