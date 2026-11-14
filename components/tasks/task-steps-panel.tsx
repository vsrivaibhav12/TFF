'use client';
import { useState, useTransition, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { toggleTaskStepAction } from '@/lib/actions/task-steps';
import { toast } from 'sonner';
import { HelpCircle } from 'lucide-react';
import { formatDateIST, cn } from '@/lib/utils';

export interface Step {
  id: string;
  step_order: number;
  title: string;
  description?: string | null;
  is_required: boolean;
  completed_at: string | null;
  source_sop_step_id: string | null;
  source_template_step_id: string | null;
  guidance_notes?: string | null;
  users_profile?: { full_name: string } | null;
}

export default function TaskStepsPanel({
  taskId,
  initial,
  editable = true,
  allowAddStep = true,
  enforceSequence = false,
  status,
  currentUserName,
}: {
  taskId: string;
  initial: Step[];
  editable?: boolean;
  allowAddStep?: boolean;
  enforceSequence?: boolean;
  status?: string;
  currentUserName?: string;
}) {
  const [steps, setSteps] = useState<Step[]>(initial);
  const [showHelp, setShowHelp] = useState(false);
  const [pending, startTransition] = useTransition();

  const isClosed = status === 'completed' || status === 'cancelled';
  const canEdit = editable && !isClosed;

  const sortedSteps = useMemo(() => {
    return [...steps].sort((a, b) => a.step_order - b.step_order);
  }, [steps]);

  const completed = sortedSteps.filter((s) => s.completed_at).length;
  const total = sortedSteps.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  function toggle(s: Step) {
    const next = !s.completed_at;

    if (next && enforceSequence) {
      const idx = sortedSteps.findIndex((x) => x.id === s.id);
      const prevIncomplete = sortedSteps.slice(0, idx).find((x) => !x.completed_at);
      if (prevIncomplete) {
        toast.error(`Complete step ${prevIncomplete.step_order} first`);
        return;
      }
    }

    if (!next && enforceSequence) {
      const idx = sortedSteps.findIndex((x) => x.id === s.id);
      const nextComplete = sortedSteps.slice(idx + 1).find((x) => x.completed_at);
      if (nextComplete) {
        toast.error(`Uncheck step ${nextComplete.step_order} first`);
        return;
      }
    }

    setSteps((arr) => arr.map((x) => x.id === s.id ? { ...x, completed_at: next ? new Date().toISOString() : null, users_profile: next ? { full_name: currentUserName ?? 'You' } : x.users_profile } : x));
    startTransition(async () => {
      const r = await toggleTaskStepAction({ step_id: s.id, task_id: taskId, completed: next });
      if (!r.success) {
        setSteps((arr) => arr.map((x) => x.id === s.id ? { ...x, completed_at: s.completed_at } : x));
        toast.error(r.error);
      }
    });
  }

  return (
    <section className="space-y-2" data-testid="task-steps-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="tff-eyebrow">Steps</h3>
          {canEdit && (
            <button onClick={() => setShowHelp((v) => !v)} className="text-slate-300 hover:text-slate-500" title="How to use the checklist">
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('tff-pill', pct === 100 ? 'tff-pill-good' : 'tff-pill-accent')}>{completed}/{total}</span>
        </div>
      </div>

      {showHelp && (
        <div className="space-y-1 rounded-[10px] border border-[#E8EAEE] bg-slate-50 p-3 text-xs text-slate-600">
          <p><strong>Check</strong> a box to mark a step complete.</p>
          <p>Steps are read-only here. To change them, edit the service or sub-service in the Services screen.</p>
          {enforceSequence && <p className="text-teal-700"><strong>Sequence enforced:</strong> complete steps in order; uncheck in reverse order.</p>}
          {isClosed && <p className="text-red-600"><strong>Locked:</strong> this task is closed, so steps cannot be edited.</p>}
        </div>
      )}

      {sortedSteps.length === 0 ? (
        <p className="text-sm text-slate-500">No checklist for this task yet. Steps appear here when the task is linked to a sub-service.</p>
      ) : (
        <ul className="divide-y divide-[#E8EAEE]">
          {sortedSteps.map((s) => {
            const done = !!s.completed_at;
            return (
              <li key={s.id} className="flex items-start gap-2.5 py-2">
                <Checkbox checked={done} onCheckedChange={() => toggle(s)} disabled={!canEdit} data-testid={`step-${s.id}`} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className={cn('text-[13px] font-medium text-slate-900', done && 'text-slate-400 line-through')}>{s.title}</div>
                  {(s.description || s.guidance_notes) && !done && (
                    <div className="mt-0.5 text-xs leading-snug text-slate-500">
                      {s.description}
                      {s.description && s.guidance_notes && <br />}
                      {s.guidance_notes}
                    </div>
                  )}
                  {done && (
                    <div className="mt-0.5 text-xs text-slate-400">
                      {s.users_profile?.full_name ?? 'Someone'} · {formatDateIST(s.completed_at!)}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
