'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { Footprints } from 'lucide-react';
import { loadTemplateStepsAction } from '@/lib/actions/tasks';

interface Props {
  taskId: string;
  subServiceId?: string;
  currentSteps: any[];
}

export default function LoadTemplateStepsButton({ taskId, subServiceId, currentSteps }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [pending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  async function loadTemplates() {
    if (!subServiceId) { toast.error('No sub-service linked'); return; }
    if (loaded) { setOpen(true); return; }
    try {
      const res = await fetch(`/api/task-templates?sub_service_id=${subServiceId}`);
      const data = await res.json();
      setTemplates(data.items ?? []);
      setLoaded(true);
      setOpen(true);
    } catch {
      toast.error('Failed to load templates');
    }
  }

  function apply() {
    if (!selected) return;
    startTransition(async () => {
      const r = await loadTemplateStepsAction({ task_id: taskId, task_template_id: selected });
      if (!r.success) toast.error(r.error);
      else {
        toast.success(`Loaded ${r.data?.count ?? 0} step(s)`);
        setOpen(false);
        setSelected('');
        router.refresh();
      }
    });
  }

  if (currentSteps.length > 0) return null;

  return (
    <div className="flex items-center gap-3">
      {!open ? (
        <Button variant="outline" size="sm" onClick={loadTemplates}>
          <Footprints className="h-4 w-4 mr-1" /> Load steps from template
        </Button>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="flex-1 text-sm"><SelectValue placeholder="Choose template..." /></SelectTrigger>
            <SelectContent>
              {templates.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>{t.title} ({t.frequency})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={apply} disabled={!selected || pending}>Load</Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}
