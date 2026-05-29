'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { Footprints, BookOpen } from 'lucide-react';
import { loadTemplateStepsAction, loadSopStepsAction } from '@/lib/actions/tasks';

interface Props {
  taskId: string;
  subServiceId?: string;
  currentSteps: any[];
}

export default function LoadTemplateStepsButton({ taskId, subServiceId, currentSteps }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'template' | 'sop'>('idle');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [pending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [hasSop, setHasSop] = useState<boolean | null>(null);

  async function discover() {
    if (!subServiceId) { toast.error('This task is not linked to a sub-service. Link a sub-service from the client profile to load steps.'); return; }
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/task-templates?sub_service_id=${subServiceId}`),
        fetch(`/api/sub-services/${subServiceId}/sop-steps`),
      ]);
      const tData = await tRes.json();
      const sData = await sRes.json();
      setTemplates(tData.items ?? []);
      setHasSop((sData.items ?? []).length > 0);
      setLoaded(true);

      const tplCount = (tData.items ?? []).length;
      const sopCount = (sData.items ?? []).length;

      if (tplCount === 0 && sopCount === 0) {
        toast.error('No templates or SOP steps found for this sub-service.');
        return;
      }
      if (tplCount > 0) {
        setMode('template');
      } else {
        setMode('sop');
      }
    } catch {
      toast.error('Failed to load step sources');
    }
  }

  function applyTemplate() {
    if (!selected) return;
    startTransition(async () => {
      const r = await loadTemplateStepsAction({ task_id: taskId, task_template_id: selected });
      if (!r.success) toast.error(r.error);
      else {
        toast.success(`Loaded ${r.data?.count ?? 0} step(s) from template`);
        setMode('idle');
        setSelected('');
        router.refresh();
      }
    });
  }

  function applySop() {
    if (!subServiceId) return;
    startTransition(async () => {
      const r = await loadSopStepsAction({ task_id: taskId, sub_service_id: subServiceId });
      if (!r.success) toast.error(r.error);
      else {
        toast.success(`Loaded ${r.data?.count ?? 0} SOP step(s)`);
        setMode('idle');
        router.refresh();
      }
    });
  }

  if (currentSteps.length > 0) return null;

  return (
    <div className="flex items-center gap-3">
      {mode === 'idle' && (
        <Button variant="outline" size="sm" onClick={discover}>
          <Footprints className="h-4 w-4 mr-1" /> Load steps
        </Button>
      )}

      {mode === 'template' && (
        <div className="flex items-center gap-2 flex-1">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="flex-1 text-sm"><SelectValue placeholder="Choose template..." /></SelectTrigger>
            <SelectContent>
              {templates.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>{t.title} ({t.frequency})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={applyTemplate} disabled={!selected || pending}>Load</Button>
          {hasSop && (
            <Button size="sm" variant="ghost" onClick={() => { setMode('sop'); setSelected(''); }}>
              <BookOpen className="h-3 w-3 mr-1" /> Use SOP instead
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setMode('idle')}>Cancel</Button>
        </div>
      )}

      {mode === 'sop' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-600">Load steps from sub-service SOP?</span>
          <Button size="sm" onClick={applySop} disabled={pending}>
            <BookOpen className="h-3 w-3 mr-1" /> Load SOP steps
          </Button>
          {templates.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => { setMode('template'); }}>
              Use template instead
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setMode('idle')}>Cancel</Button>
        </div>
      )}
    </div>
  );
}
