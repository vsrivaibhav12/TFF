'use client';
import { useState, useTransition, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toggleTaskStepAction } from '@/lib/actions/task-steps';
import { toast } from 'sonner';
import { ListChecks, HelpCircle } from 'lucide-react';
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
    <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4" data-testid="task-steps-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4 text-teal-600" /> Checklist</h3>
          {canEdit && (
            <button onClick={() => setShowHelp((v) => !v)} className="text-zinc-300 hover:text-zinc-500" title="How to use checklist">
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
        </div>
        <Badge variant={pct === 100 ? 'success' : 'outline'}>{completed} / {total} · {pct}%</Badge>
      </div>

      {showHelp && (
        <div className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-1">
          <p><strong>Check</strong> a box to mark a step complete.</p>
          <p>Task steps are read-only here. To modify steps, go to the Service or Sub-Service configuration in the Admin panel.</p>
          {enforceSequence && <p className="text-teal-700"><strong>Sequence enforced:</strong> complete steps in order; uncheck in reverse order.</p>}
          {isClosed && <p className="text-red-600"><strong>Locked:</strong> this task is closed — steps cannot be edited.</p>}
        </div>
      )}

      {total > 0 && (
        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div className="h-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {sortedSteps.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-zinc-500">No checklist for this task yet.</p>
          <p className="text-xs text-zinc-400">If this task is linked to a sub-service, steps will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">{sortedSteps.map((s, idx) => {
          const done = !!s.completed_at;
          return (
            <li key={s.id} className={cn('flex items-start gap-2 rounded-lg border border-zinc-200 p-3', done && 'bg-teal-50/30 border-teal-200')}>
              <Checkbox checked={done} onCheckedChange={() => toggle(s)} disabled={pending || !canEdit} data-testid={`step-${s.id}`} className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className={cn('text-sm font-semibold text-zinc-900', done && 'line-through text-zinc-500 font-medium')}>{s.title}</div>
                {(s.description || s.guidance_notes) && (
                  <div className={cn("text-xs mt-1.5 p-2 rounded-md border", done ? "text-zinc-500 bg-transparent border-transparent" : "text-zinc-600 bg-zinc-50 border-zinc-100")}>
                    {s.description}
                    {s.description && s.guidance_notes && <br/>}
                    {s.guidance_notes}
                  </div>
                )}
                {done && (
                  <div className="text-[10px] text-zinc-400 mt-1.5 font-medium">
                    ✓ {s.users_profile?.full_name ?? 'someone'} · {formatDateIST(s.completed_at!)}
                  </div>
                )}
              </div>
            </li>
          );
        })}
        </ul>
      )}
    </div>
  );
}
