'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { createLabelAction, deactivateLabelAction, updateLabelAction } from '@/lib/actions/task-custom-fields';
import type { TaskLabel } from '@/lib/repositories/task-custom-fields';

const COLOR_PRESETS = ['#0ea5e9', '#14b8a6', '#84cc16', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export default function LabelsAdmin({ initial }: { initial: TaskLabel[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ code: '', display_name: '', color_hex: COLOR_PRESETS[0] });
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLOR_PRESETS[0]);

  function add() {
    if (!form.code.trim() || !form.display_name.trim()) {
      toast.error('Code and display name are required');
      return;
    }
    startTransition(async () => {
      const r = await createLabelAction(form);
      if (!r.success) { toast.error(r.error); return; }
      toast.success(`Label "${form.display_name}" created`);
      setForm({ code: '', display_name: '', color_hex: COLOR_PRESETS[0] });
      router.refresh();
    });
  }

  function saveEdit(code: string) {
    if (!editName.trim()) { toast.error('Display name is required'); return; }
    startTransition(async () => {
      const r = await updateLabelAction({ code, display_name: editName.trim(), color_hex: editColor });
      if (!r.success) { toast.error(r.error); return; }
      toast.success('Label updated');
      setEditingCode(null);
      router.refresh();
    });
  }

  function deactivate(code: string) {
    startTransition(async () => {
      const r = await deactivateLabelAction(code);
      if (!r.success) { toast.error(r.error); return; }
      toast.success('Label archived');
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="tff-card tff-card-pad">
        <h2 className="text-base font-semibold mb-4">Add new label</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="urgent" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Display name</Label>
            <Input id="display_name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Urgent" />
          </div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex gap-1.5 mt-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color_hex: c })}
                  className={`h-7 w-7 rounded-full border-2 ${form.color_hex === c ? 'border-slate-900' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={add} disabled={pending} data-testid="add-label-btn">
            {pending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Add label
          </Button>
        </div>
      </div>

      <div className="tff-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold">Existing labels</h2>
        </div>
        {initial.length === 0 ? (
          <div className="p-8 text-sm text-slate-500 text-center">No labels yet. Add your first above — for example "urgent", "high-value", "audit".</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {initial.map((l) => (
              <li key={l.code} className="px-6 py-3 flex items-center justify-between gap-3">
                {editingCode === l.code ? (
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 max-w-xs" aria-label="Display name" />
                    <div className="flex gap-1.5">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={`h-6 w-6 rounded-full border-2 ${editColor === c ? 'border-slate-900' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                          aria-label={c}
                        />
                      ))}
                    </div>
                    <Button size="sm" onClick={() => saveEdit(l.code)} disabled={pending}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingCode(null)} disabled={pending}>Cancel</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: l.color_hex ?? '#64748b' }} />
                      <span className="font-medium">{l.display_name}</span>
                      <code className="text-xs text-slate-500">{l.code}</code>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingCode(l.code); setEditName(l.display_name); setEditColor(l.color_hex ?? COLOR_PRESETS[0]); }}
                        disabled={pending}
                        aria-label={`Edit ${l.display_name}`}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <button
                        onClick={() => deactivate(l.code)}
                        disabled={pending}
                        className="text-slate-500 hover:text-red-600 p-1"
                        aria-label={`Archive ${l.display_name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
