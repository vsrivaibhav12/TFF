'use client';

import { useState } from 'react';
import { Check, Play, RotateCcw, Undo2, XCircle, Loader2, CheckCircle2 } from 'lucide-react';
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

  const spinner = (to: string) => (transitioning === to ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null);

  return (
    <section className="tff-card p-4 space-y-4" aria-label="Task status" data-testid="task-status-stepper">
      {cancelled ? (
        <div className="flex items-center gap-2 text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <XCircle className="h-4 w-4 shrink-0" /> This task is cancelled
        </div>
      ) : (
        <ol className="flex items-start" aria-label="Progress">
          {STEPS.map((s, i) => {
            const done = i < currentIdx || status === 'completed';
            const current = i === currentIdx && status !== 'completed';
            const reached = done || current;
            return (
              <li key={s.key} className={cn('flex-1 min-w-0', i < STEPS.length - 1 && 'relative')} aria-current={current ? 'step' : undefined}>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn('absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-[13px] h-0.5 rounded-full transition-colors duration-300', i < currentIdx || status === 'completed' ? 'bg-teal-500' : 'bg-zinc-200')}
                  />
                )}
                <div className="flex flex-col items-center text-center gap-1">
                  <span
                    className={cn(
                      'relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300',
                      done && 'border-teal-600 bg-teal-600 text-white',
                      current && 'border-teal-600 bg-white text-teal-700 ring-4 ring-teal-100',
                      !reached && 'border-zinc-200 bg-white text-zinc-400',
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={cn('text-xs font-medium', reached ? 'text-zinc-900' : 'text-zinc-400')}>{s.label}</span>
                  <span className="text-xs text-zinc-500 tabular-nums h-4">{reached && dates[s.key] ? formatDateIST(dates[s.key]) : ''}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="sr-only" role="status" aria-live="polite">Status: {status.replace('_', ' ')}</p>

      {canAct && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {status === 'pending' && (
              <Button size="sm" onClick={() => onTransition('in_progress')} disabled={busy} data-testid="stepper-start">
                {spinner('in_progress') ?? <Play className="h-4 w-4 mr-1.5" />} Start task
              </Button>
            )}
            {status === 'in_progress' && !askBilling && (
              <Button size="sm" onClick={complete} disabled={busy} data-testid="stepper-complete">
                {spinner('completed') ?? <CheckCircle2 className="h-4 w-4 mr-1.5" />} Mark complete
              </Button>
            )}
            {(status === 'completed' || status === 'cancelled') && (
              <Button size="sm" variant="outline" onClick={() => onTransition(status === 'completed' ? 'in_progress' : 'pending')} disabled={busy} data-testid="stepper-reopen">
                {spinner(status === 'completed' ? 'in_progress' : 'pending') ?? <RotateCcw className="h-4 w-4 mr-1.5" />} Reopen task
              </Button>
            )}
            {status === 'in_progress' && !askBilling && (
              <Button size="sm" variant="ghost" onClick={() => onTransition('pending')} disabled={busy}>
                {spinner('pending') ?? <Undo2 className="h-4 w-4 mr-1.5" />} Back to pending
              </Button>
            )}
            {(status === 'pending' || status === 'in_progress') && !askBilling && (
              <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-red-600" onClick={() => onTransition('cancelled')} disabled={busy}>
                {spinner('cancelled') ?? <XCircle className="h-4 w-4 mr-1.5" />} Cancel task
              </Button>
            )}
          </div>

          {askBilling && status === 'in_progress' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-3">
              <p className="text-sm text-zinc-700">This task is billable. Add the bill details to complete it.</p>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-2">
                <Input value={billRef} onChange={(e) => setBillRef(e.target.value)} placeholder="Bill reference" aria-label="Bill reference" />
                <Input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" aria-label="Bill amount" />
              </div>
              <Input value={arn} onChange={(e) => setArn(e.target.value)} placeholder="ARN or acknowledgement number (optional)" aria-label="ARN reference" />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={complete} disabled={busy || !billRef.trim() || !(parseFloat(amount) > 0)} data-testid="stepper-complete-confirm">
                  {spinner('completed')} Complete task
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAskBilling(false)} disabled={busy}>Back</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
