'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { upsertTdsFilingAction } from '@/lib/actions/compliance';

export default function TdsEntryForm({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    period_year: new Date().getFullYear(),
    period_quarter: 1,
    status: 'not_started',
    total_deductions: '',
    tax_deposited: '',
    deductee_count: '',
    filed_date: '',
    ack_number: '',
    change_reason: '',
  });

  function submit() {
    startTransition(async () => {
      const r = await upsertTdsFilingAction({
        client_id: clientId,
        period_year: Number(f.period_year),
        period_quarter: Number(f.period_quarter),
        status: f.status as any,
        total_deductions: f.total_deductions ? Number(f.total_deductions) : null,
        tax_deposited: f.tax_deposited ? Number(f.tax_deposited) : null,
        deductee_count: f.deductee_count ? Number(f.deductee_count) : null,
        filed_date: f.filed_date || null,
        ack_number: f.ack_number || null,
        change_reason: f.change_reason || null,
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success('TDS filing saved');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" /> New TDS</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New TDS filing — {clientName}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Status</Label><Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['not_started', 'data_received', 'in_progress', 'review', 'filed'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Quarter</Label><Select value={String(f.period_quarter)} onValueChange={(v) => setF({ ...f, period_quarter: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4].map(x => <SelectItem key={x} value={String(x)}>Q{x}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Period year</Label><Input type="number" value={f.period_year} onChange={(e) => setF({ ...f, period_year: e.target.valueAsNumber })} /></div>
          <div><Label>Total deductions ₹</Label><Input value={f.total_deductions} onChange={(e) => setF({ ...f, total_deductions: e.target.value })} /></div>
          <div><Label>Tax deposited ₹</Label><Input value={f.tax_deposited} onChange={(e) => setF({ ...f, tax_deposited: e.target.value })} /></div>
          <div><Label>Deductee count</Label><Input value={f.deductee_count} onChange={(e) => setF({ ...f, deductee_count: e.target.value })} /></div>
          <div><Label>Filed on</Label><Input type="date" value={f.filed_date} onChange={(e) => setF({ ...f, filed_date: e.target.value })} /></div>
          <div><Label>Ack #</Label><Input value={f.ack_number} onChange={(e) => setF({ ...f, ack_number: e.target.value })} /></div>
          <div className="col-span-2"><Label>Change reason (if revising)</Label><Input value={f.change_reason} onChange={(e) => setF({ ...f, change_reason: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={pending}>{pending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving…</> : 'Save'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
