'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { upsertServiceCategoryAction, deleteServiceCategoryAction } from '@/lib/actions/services-catalogue';
import { toast } from 'sonner';
import { Trash2, Pencil, Plus } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string | null;
  display_order?: number | null;
}

export function CategoryManager({ categories, onChange }: { categories: Category[]; onChange?: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function startEdit(cat: Category) {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description ?? '');
  }

  function startNew() {
    setEditing(null);
    setName('');
    setDescription('');
  }

  function save() {
    if (!name.trim()) { toast.error('Name is required'); return; }
    startTransition(async () => {
      const r = await upsertServiceCategoryAction({
        id: editing?.id,
        name: name.trim(),
        description: description.trim() || undefined,
        display_order: editing?.display_order ?? (categories.length + 1) * 10,
      });
      if (r.success) {
        toast.success(editing ? 'Category updated' : 'Category created');
        startNew();
        onChange?.();
      } else toast.error(r.error);
    });
  }

  function remove(id: string) {
    if (!confirm('Delete this category? Services in this category will become uncategorized.')) return;
    startTransition(async () => {
      const r = await deleteServiceCategoryAction(id);
      if (r.success) { toast.success('Deleted'); onChange?.(); }
      else toast.error(r.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) startNew(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs border-zinc-200 text-zinc-600 hover:text-zinc-900">
          Manage categories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Service categories</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tax Compliance" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={pending} size="sm" className="bg-teal-600 hover:bg-teal-700">
              {editing ? 'Update' : 'Create'} category
            </Button>
            {editing && <Button size="sm" variant="ghost" onClick={startNew}>Cancel edit</Button>}
          </div>

          <div className="border-t border-zinc-100 pt-3">
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">Existing categories</div>
            {categories.length === 0 ? (
              <div className="text-xs text-zinc-400 py-4 text-center">No categories yet.</div>
            ) : (
              <ul className="space-y-1">
                {categories.map((cat) => (
                  <li key={cat.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{cat.name}</div>
                      {cat.description && <div className="text-xs text-zinc-500">{cat.description}</div>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(cat)}><Pencil className="h-3.5 w-3.5 text-zinc-500" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(cat.id)}><Trash2 className="h-3.5 w-3.5 text-zinc-500" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
