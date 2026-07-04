'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { upsertTaskTemplateStepAction, deleteTaskTemplateStepAction, reorderTaskTemplateStepsAction } from '@/lib/actions/task-templates';
import { GripVertical, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Step {
  id: string;
  step_order: number;
  title: string;
  description?: string | null;
  is_required?: boolean;
  guidance_notes?: string | null;
}

interface Template {
  id: string;
  title: string;
  frequency: string;
  is_active: boolean;
}

export default function TaskTemplateStepsDialog({
  template,
  steps: initialSteps,
  children,
}: {
  template: Template;
  steps: Step[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftGuidance, setDraftGuidance] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editGuidance, setEditGuidance] = useState('');
  const [pending, startTransition] = useTransition();

  function addStep() {
    if (!draftTitle.trim()) return;
    startTransition(async () => {
      const next_order = (steps[steps.length - 1]?.step_order ?? 0) + 1;
      const r = await upsertTaskTemplateStepAction({
        task_template_id: template.id,
        step_order: next_order,
        title: draftTitle.trim(),
        is_required: true,
        guidance_notes: draftGuidance || undefined,
      });
      if (r.success) {
        toast.success('Step added');
        setDraftTitle('');
        setDraftGuidance('');
        setSteps((s) => [...s, { id: (r as any).data.id, step_order: next_order, title: draftTitle.trim(), is_required: true, guidance_notes: draftGuidance || null }]);
      } else toast.error(r.error);
    });
  }

  function startEdit(step: Step) {
    setEditingId(step.id);
    setEditTitle(step.title);
    setEditGuidance(step.guidance_notes ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditGuidance('');
  }

  function saveEdit(stepId: string) {
    if (!editTitle.trim()) return;
    startTransition(async () => {
      const r = await upsertTaskTemplateStepAction({
        id: stepId,
        task_template_id: template.id,
        step_order: steps.find((s) => s.id === stepId)?.step_order ?? 1,
        title: editTitle.trim(),
        is_required: true,
        guidance_notes: editGuidance || undefined,
      });
      if (r.success) {
        toast.success('Step updated');
        setSteps((s) => s.map((x) => x.id === stepId ? { ...x, title: editTitle.trim(), guidance_notes: editGuidance || null } : x));
        cancelEdit();
      } else toast.error(r.error);
    });
  }

  function removeStep(id: string) {
    startTransition(async () => {
      const r = await deleteTaskTemplateStepAction(id);
      if (r.success) { toast.success('Removed'); setSteps((s) => s.filter((x) => x.id !== id)); }
      else toast.error(r.error);
    });
  }

  function move(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    const reordered = [...steps];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    setSteps(reordered);
    startTransition(async () => {
      const r = await reorderTaskTemplateStepsAction({ task_template_id: template.id, ids_in_order: reordered.map((x) => x.id) });
      if (!r.success) { toast.error(r.error); setSteps(initialSteps); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Steps — {template.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {steps.length === 0 && <div className="text-xs text-zinc-400 italic">No steps yet. Add the first one below.</div>}
          {steps.map((step, idx) => {
            const isEditing = editingId === step.id;
            return (
              <div key={step.id} className="flex items-start gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2">
                <GripVertical className="h-3 w-3 text-zinc-300 mt-0.5 shrink-0" />
                <span className="text-xs font-mono text-zinc-400 w-5 mt-0.5 shrink-0">{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Step title" className="text-sm" />
                      <Textarea value={editGuidance} onChange={(e) => setEditGuidance(e.target.value)} placeholder="Guidance notes (optional)" rows={2} className="text-sm" />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => saveEdit(step.id)} disabled={pending || !editTitle.trim()}><Check className="h-3 w-3" /> Save</Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-3 w-3" /> Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm">{step.title}</div>
                      {step.guidance_notes && <div className="text-xs text-zinc-500 mt-0.5">{step.guidance_notes}</div>}
                    </>
                  )}
                </div>
                {!isEditing && (
                  <>
                    <button onClick={() => startEdit(step)} className="text-zinc-400 hover:text-zinc-700 mt-0.5" title="Edit step"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-zinc-400 hover:text-zinc-700 disabled:opacity-30 text-xs mt-0.5">↑</button>
                    <button onClick={() => move(idx, 1)} disabled={idx === steps.length - 1} className="text-zinc-400 hover:text-zinc-700 disabled:opacity-30 text-xs mt-0.5">↓</button>
                    <button onClick={() => removeStep(step.id)} className="text-zinc-400 hover:text-red-600 mt-0.5"><Trash2 className="h-3 w-3" /></button>
                  </>
                )}
              </div>
            );
          })}
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Step title, e.g. Reconcile vendor invoices vs 2B" className="text-sm" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }} />
            <Textarea value={draftGuidance} onChange={(e) => setDraftGuidance(e.target.value)} placeholder="Guidance notes for staff (optional)" rows={2} className="text-sm" />
            <Button onClick={addStep} disabled={pending || !draftTitle.trim()} size="sm"><Plus className="h-3 w-3" /> Add step</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
