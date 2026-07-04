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
import { upsertItFilingAction } from '@/lib/actions/compliance';

export default function ItEntryForm({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    fy_ending_year: new Date().getFullYear(),
    status: 'not_started',
    gross_income: '',
    deductions_claimed: '',
    taxable_income: '',
    tax_liability: '',
    refund_amount: '',
    filed_date: '',
    ack_number: '',
    change_reason: '',
  });

  function submit() {
    startTransition(async () => {
      const r = await upsertItFilingAction({
        client_id: clientId,
        fy_ending_year: Number(f.fy_ending_year),
        status: f.status as any,
        gross_income: f.gross_income ? Number(f.gross_income) : null,
        deductions_claimed: f.deductions_claimed ? Number(f.deductions_claimed) : null,
        taxable_income: f.taxable_income ? Number(f.taxable_income) : null,
        tax_liability: f.tax_liability ? Number(f.tax_liability) : null,
        refund_amount: f.refund_amount ? Number(f.refund_amount) : null,
        filed_date: f.filed_date || null,
        ack_number: f.ack_number || null,
        change_reason: f.change_reason || null,
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success('Income tax filing saved');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" /> New IT</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New income tax filing — {clientName}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Status</Label><Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['not_started', 'data_received', 'in_progress', 'review', 'filed'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>FY ending year</Label><Input type="number" value={f.fy_ending_year} onChange={(e) => setF({ ...f, fy_ending_year: e.target.valueAsNumber })} /></div>
          <div><Label>Gross income ₹</Label><Input value={f.gross_income} onChange={(e) => setF({ ...f, gross_income: e.target.value })} /></div>
          <div><Label>Deductions claimed ₹</Label><Input value={f.deductions_claimed} onChange={(e) => setF({ ...f, deductions_claimed: e.target.value })} /></div>
          <div><Label>Taxable income ₹</Label><Input value={f.taxable_income} onChange={(e) => setF({ ...f, taxable_income: e.target.value })} /></div>
          <div><Label>Tax liability ₹</Label><Input value={f.tax_liability} onChange={(e) => setF({ ...f, tax_liability: e.target.value })} /></div>
          <div><Label>Refund amount ₹</Label><Input value={f.refund_amount} onChange={(e) => setF({ ...f, refund_amount: e.target.value })} /></div>
          <div><Label>Filed on</Label><Input type="date" value={f.filed_date} onChange={(e) => setF({ ...f, filed_date: e.target.value })} /></div>
          <div><Label>Ack #</Label><Input value={f.ack_number} onChange={(e) => setF({ ...f, ack_number: e.target.value })} /></div>
          <div className="col-span-2"><Label>Change reason (if revising)</Label><Input value={f.change_reason} onChange={(e) => setF({ ...f, change_reason: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={pending}>{pending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving…</> : 'Save'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
