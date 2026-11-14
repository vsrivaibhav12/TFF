'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatDateIST } from '@/lib/utils';
import type { TaskStatus } from '@/lib/validation/schemas';

type Extra = { note?: string; bill_reference?: string | null; bill_amount?: number | null; arn_reference?: string | null };

const STEPS: { key: Exclude<TaskStatus, 'cancelled'>; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
];

/**
 * Status header for a task: where it is in its life (pending, in progress, completed), when
 * each stage happened, and the one or two actions that make sense next. Changes show at once
 * because the parent passes an optimistic status.
 */
export function TaskStatusStepper({
  taskId,
  status,
  createdDate,
  startedDate,
  completedDate,
  isBillable,
  billReference,
  billAmount,
  canAct,
  transitioning,
  onTransition,
}: {
  taskId: string;
  status: string;
  createdDate?: string | null;
  startedDate?: string | null;
  completedDate?: string | null;
  isBillable?: boolean;
  billReference?: string | null;
  billAmount?: number | null;
  canAct: boolean;
  transitioning: string | null;
  onTransition: (to: TaskStatus, extra?: Extra) => Promise<boolean>;
}) {
  const [askBilling, setAskBilling] = useState(false);
  const [billRef, setBillRef] = useState(billReference ?? '');
  const [amount, setAmount] = useState(billAmount ? String(billAmount) : '');
  const [arn, setArn] = useState('');

  const busy = transitioning !== null;
  const cancelled = status === 'cancelled';
  const currentIdx = STEPS.findIndex((s) => s.key === status);
  const dates: Record<string, string | null | undefined> = { pending: createdDate, in_progress: startedDate, completed: completedDate };
  const needsBilling = !!isBillable && (!billReference || !billAmount);

  async function complete() {
    if (needsBilling && !askBilling) {
      setAskBilling(true);
      return;
    }
    const extra: Extra = {};
    if (askBilling) {
      extra.bill_reference = billRef.trim() || null;
      extra.bill_amount = amount ? parseFloat(amount) : null;
    }
    if (arn.trim()) extra.arn_reference = arn.trim();
    const ok = await onTransition('completed', extra);
    if (ok) setAskBilling(false);
  }


  // The action rail starts completion by event, so the billing details form stays here with its own state.
  const completeRef = useRef(complete);
  completeRef.current = complete;
  useEffect(() => {
    function onComplete(e: Event) {
      if ((e as CustomEvent).detail?.taskId === taskId) void completeRef.current();
    }
    window.addEventListener('tff:task-complete', onComplete);
    return () => window.removeEventListener('tff:task-complete', onComplete);
  }, [taskId]);

  return (
    <section className="space-y-3" aria-label="Task status" data-testid="task-status-stepper">
      {cancelled ? (
        <div className="flex items-center gap-2 rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          <XCircle className="h-4 w-4 shrink-0" /> This task is cancelled
        </div>
      ) : (
        <ol className="flex flex-wrap gap-1.5" aria-label="Progress">
          {STEPS.map((s, i) => {
            const done = i < currentIdx || status === 'completed';
            const current = i === currentIdx && status !== 'completed';
            const date = dates[s.key];
            return (
              <li key={s.key} aria-current={current ? 'step' : undefined}>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px]',
                    current && 'border-transparent bg-[#E6F6F3] font-medium text-[#0B6B62]',
                    done && 'border-transparent bg-[#E7F6EC] font-medium text-green-700',
                    !current && !done && 'border-[#E8EAEE] text-slate-500',
                  )}
                  title={date ? formatDateIST(date) : undefined}
                >
                  {done && <Check className="h-3.5 w-3.5" />}
                  {s.label}
                  {(done || current) && date && <span className="text-xs font-normal tabular-nums opacity-70">{formatDateIST(date)}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="sr-only" role="status" aria-live="polite">Status: {status.replace('_', ' ')}</p>

      {canAct && askBilling && status === 'in_progress' && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-sm text-slate-700">This task is billable. Add the bill details to complete it.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem]">
            <Input value={billRef} onChange={(e) => setBillRef(e.target.value)} placeholder="Bill reference" aria-label="Bill reference" />
            <Input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" aria-label="Bill amount" />
          </div>
          <Input value={arn} onChange={(e) => setArn(e.target.value)} placeholder="ARN or acknowledgement number (optional)" aria-label="ARN reference" />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={complete} disabled={busy || !billRef.trim() || !(parseFloat(amount) > 0)} data-testid="stepper-complete-confirm">
              {transitioning === 'completed' && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Complete task
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAskBilling(false)} disabled={busy}>Back</Button>
          </div>
        </div>
      )}
    </section>
  );
}
