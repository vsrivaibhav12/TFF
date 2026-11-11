'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { upsertComplianceRuleAction, refreshAllComplianceEventsAction } from '@/lib/actions/compliance-calendar';

export interface EditableRule {
  id: string;
  rule_code: string;
  display_name: string;
  service_kind: string;
  periodicity: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'one_off';
  due_day: number | null;
  due_month_offset: number;
  due_date_formula: string | null;
  applies_when: Record<string, unknown> | null;
  reminder_days: number[] | null;
  description: string | null;
  is_active: boolean;
}

/** Edit the due-date settings of one compliance rule. Calendar events are refreshed after saving. */
export default function RuleEditDialog({ rule }: { rule: EditableRule }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(rule.display_name);
  const [description, setDescription] = useState(rule.description ?? '');
  const [dueDay, setDueDay] = useState(rule.due_day != null ? String(rule.due_day) : '');
  const [offset, setOffset] = useState(String(rule.due_month_offset ?? 1));
  const [reminders, setReminders] = useState((rule.reminder_days ?? [7, 3, 1]).join(', '));

  function save() {
    const day = dueDay.trim() === '' ? null : parseInt(dueDay, 10);
    const off = parseInt(offset, 10);
    const reminderDays = reminders.split(',').map((s) => s.trim()).filter(Boolean).map((s) => parseInt(s, 10));
    if (!displayName.trim()) { toast.error('Name is required'); return; }
    if (day !== null && (Number.isNaN(day) || day < 1 || day > 31)) { toast.error('Due day must be between 1 and 31'); return; }
    if (Number.isNaN(off) || off < 0 || off > 12) { toast.error('Month offset must be between 0 and 12'); return; }
    if (reminderDays.some((n) => Number.isNaN(n) || n < 0)) { toast.error('Reminders must be whole numbers of days, separated by commas'); return; }

    startTransition(async () => {
      const r = await upsertComplianceRuleAction({
        id: rule.id,
        rule_code: rule.rule_code,
        display_name: displayName.trim(),
        service_kind: rule.service_kind,
        periodicity: rule.periodicity,
        due_day: day,
        due_month_offset: off,
        due_date_formula: rule.due_date_formula,
        applies_when: (rule.applies_when ?? {}) as Record<string, unknown>,
        reminder_days: reminderDays,
        description: description.trim() || null,
        is_active: rule.is_active,
      } as Parameters<typeof upsertComplianceRuleAction>[0]);
      if (!r.success) { toast.error(r.error); return; }
      const refreshed = await refreshAllComplianceEventsAction();
      if (!refreshed.success) toast.error(`Rule saved, but the calendar did not refresh: ${refreshed.error}`);
      else toast.success('Rule updated and calendar refreshed');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label={`Edit ${rule.display_name}`} data-testid={`rule-edit-${rule.id}`}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit rule {rule.rule_code}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`rule-name-${rule.id}`}>Name</Label>
            <Input id={`rule-name-${rule.id}`} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`rule-desc-${rule.id}`}>Description</Label>
            <Textarea id={`rule-desc-${rule.id}`} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`rule-day-${rule.id}`}>Due day of month</Label>
              <Input id={`rule-day-${rule.id}`} type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`rule-offset-${rule.id}`}>Months after period end</Label>
              <Input id={`rule-offset-${rule.id}`} type="number" min={0} max={12} value={offset} onChange={(e) => setOffset(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`rule-rem-${rule.id}`}>Reminders (days before due, separated by commas)</Label>
            <Input id={`rule-rem-${rule.id}`} value={reminders} onChange={(e) => setReminders(e.target.value)} placeholder="7, 3, 1" />
          </div>
          <p className="text-xs text-zinc-500">Saving refreshes calendar events for all clients.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button onClick={save} disabled={pending}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
