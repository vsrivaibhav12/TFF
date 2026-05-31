'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { Footprints, BookOpen } from 'lucide-react';
import { loadTemplateStepsAction, loadSopStepsAction, updateTaskAction } from '@/lib/actions/tasks';

interface Props {
  taskId: string;
  subServiceId?: string;
  clientId?: string;
  currentSteps: any[];
}

export default function LoadTemplateStepsButton({ taskId, subServiceId, clientId, currentSteps }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'linking' | 'template' | 'sop'>('idle');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [pending, startTransition] = useTransition();
  const [hasSop, setHasSop] = useState<boolean | null>(null);
  
  const [clientSubServices, setClientSubServices] = useState<any[]>([]);
  const [selectedSubService, setSelectedSubService] = useState('');

  // Use the provided subServiceId, or the one we just linked
  const activeSubServiceId = subServiceId || selectedSubService;

  async function discover() {
    if (!subServiceId) {
      if (!clientId) {
         toast.error('This task is not linked to a client.');
         return;
      }
      // Load client's sub-services so they can link it
      try {
        const r = await fetch(`/api/clients/${clientId}/sub-services`);
        const data = await r.json();
        setClientSubServices(data.items ?? []);
        setMode('linking');
      } catch {
        toast.error('Failed to load client sub-services');
      }
      return;
    }
    
    await loadOptions(subServiceId);
  }

  async function linkAndLoad() {
    if (!selectedSubService) return;
    startTransition(async () => {
      // 1. Update the task
      const updateRes = await updateTaskAction({ task_id: taskId, sub_service_id: selectedSubService });
      if (!updateRes.success) {
        toast.error(updateRes.error);
        return;
      }
      // 2. Load the templates for this new sub-service
      await loadOptions(selectedSubService);
      router.refresh();
    });
  }

  async function loadOptions(sid: string) {
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/task-templates?sub_service_id=${sid}`),
        fetch(`/api/sub-services/${sid}/sop-steps`),
      ]);
      const tData = await tRes.json();
      const sData = await sRes.json();
      setTemplates(tData.items ?? []);
      setHasSop((sData.items ?? []).length > 0);

      const tplCount = (tData.items ?? []).length;
      const sopCount = (sData.items ?? []).length;

      if (tplCount === 0 && sopCount === 0) {
        toast.error('No templates or SOP steps found for this sub-service.');
        setMode('idle');
        return;
      }
      if (tplCount > 0) {
        setMode('template');
      } else {
        setMode('sop');
      }
    } catch {
      toast.error('Failed to load step sources');
      setMode('idle');
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
    if (!activeSubServiceId) return;
    startTransition(async () => {
      const r = await loadSopStepsAction({ task_id: taskId, sub_service_id: activeSubServiceId });
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
        <Button variant="outline" size="sm" onClick={discover} disabled={pending}>
          <Footprints className="h-4 w-4 mr-1" /> Load steps
        </Button>
      )}

      {mode === 'linking' && (
        <div className="flex items-center gap-2 flex-1">
          <Select value={selectedSubService} onValueChange={setSelectedSubService}>
            <SelectTrigger className="flex-1 text-sm"><SelectValue placeholder="Select a sub-service to link..." /></SelectTrigger>
            <SelectContent>
              {clientSubServices.map((cs: any) => (
                <SelectItem key={cs.sub_service_id} value={cs.sub_service_id}>
                  {cs.sub_services?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={linkAndLoad} disabled={!selectedSubService || pending}>
             {pending ? 'Linking...' : 'Link & Continue'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMode('idle')} disabled={pending}>Cancel</Button>
        </div>
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
