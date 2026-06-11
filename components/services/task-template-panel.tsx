'use client';
import { Badge } from '@/components/ui/badge';
import TaskTemplateDialog from './task-template-dialog';
import TaskTemplateStepsDialog from './task-template-steps-dialog';
import { ListChecks } from 'lucide-react';

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
  description?: string | null;
  estimated_days?: number | null;
  frequency: string;
  is_active: boolean;
}

interface Props {
  subService: any;
  templates: Template[];
  stepsByTemplate: Record<string, Step[]>;
}

export default function TaskTemplatePanel({ subService, templates, stepsByTemplate }: Props) {
  if (templates.length === 0) {
    return (
      <div className="mt-3 text-xs text-zinc-400 italic">
        No task templates yet.{' '}
        <TaskTemplateDialog subServiceId={subService.id} subServiceName={subService.name}>
          <button className="text-teal-700 hover:underline">Create one</button>
        </TaskTemplateDialog>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
        <ListChecks className="h-3 w-3" /> Task templates
      </div>
      <div className="space-y-1.5">
        {templates.map((tmpl) => {
          const steps = stepsByTemplate[tmpl.id] ?? [];
          return (
            <div
              key={tmpl.id}
              className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{tmpl.title}</span>
                <span className="font-mono text-[10px] text-zinc-500 shrink-0">{tmpl.frequency}</span>
                {tmpl.estimated_days != null && (
                  <Badge variant="outline" className="text-[10px] shrink-0">{tmpl.estimated_days}d</Badge>
                )}
                {!tmpl.is_active && <Badge variant="warning" className="text-[10px] shrink-0">inactive</Badge>}
                <span className="text-[10px] text-zinc-400 shrink-0">{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <TaskTemplateStepsDialog template={tmpl} steps={steps}>
                  <button className="text-xs text-teal-700 hover:underline">Steps</button>
                </TaskTemplateStepsDialog>
                <TaskTemplateDialog subServiceId={subService.id} subServiceName={subService.name} initial={tmpl}>
                  <button className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline">Edit</button>
                </TaskTemplateDialog>
              </div>
            </div>
          );
        })}
      </div>
      <TaskTemplateDialog subServiceId={subService.id} subServiceName={subService.name}>
        <button className="text-xs text-teal-700 hover:underline mt-1">+ New task template</button>
      </TaskTemplateDialog>
    </div>
  );
}
