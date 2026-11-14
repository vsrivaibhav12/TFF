'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Calculator, Receipt, FileText, ShieldCheck, AlertTriangle, Boxes, Users, ListChecks, Pencil, Plus, } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRolePrefix } from '@/lib/hooks/use-role-prefix';
import { getServiceColour } from '@/lib/semantic-colours';
import { subServicePeriodType } from '@/lib/periods';
import ServiceDialog from './service-dialog';
import SubServiceDialog from './sub-service-dialog';
import TaskTemplatePanel from './task-template-panel';

function serviceKindIcon(kind: string) {
  const map: Record<string, React.ReactNode> = {
    gst: <Calculator className="h-4 w-4" />,
    tds: <Receipt className="h-4 w-4" />,
    income_tax: <FileText className="h-4 w-4" />,
    compliance: <ShieldCheck className="h-4 w-4" />,
    notice: <AlertTriangle className="h-4 w-4" />,
  };
  return map[kind] ?? <Boxes className="h-4 w-4" />;
}

function serviceKindColor(kind: string): string {
  const c = getServiceColour(kind);
  return `${c.lightBg} ${c.text} ${c.border}`;
}

const PERIOD_SHORT: Record<string, string> = { none: '', monthly: 'Monthly', quarterly: 'Quarterly', half_yearly: 'Half-yearly', yearly: 'Yearly', gst_frequency: 'GST frequency' };

const iconBtn = 'inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900';

interface ServiceCardProps {
  s: any;
  categories: any[];
  subServices: any[];
  templatesBySub: Record<string, any[]>;
  stepsByTemplate: Record<string, any[]>;
}

/** One sub-service as a row: name and tags on the left, the same three actions on the right. */
function SubServiceRow({ ss, templates, stepsByTemplate }: { ss: any; templates: any[]; stepsByTemplate: Record<string, any[]> }) {
  const prefix = useRolePrefix();
  const [open, setOpen] = useState(false);
  const period = subServicePeriodType({ period_type: ss.period_type, frequency: ss.frequency });
  const steps = templates.reduce((n, t) => n + (stepsByTemplate[t.id]?.length ?? 0), 0);

  return (
    <li className="border-b border-[#E8EAEE] last:border-0">
      <div className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50/70">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[13px] font-medium text-slate-900">{ss.name}</span>
          {period !== 'none' && <span className="tff-pill tff-pill-mute !py-0 text-[11.5px]">{PERIOD_SHORT[period]}</span>}
          {ss.is_compliance && <span className="tff-pill tff-pill-accent !py-0 text-[11.5px]">Compliance</span>}
          {!ss.is_active && <span className="tff-pill tff-pill-warn !py-0 text-[11.5px]">Paused</span>}
        </div>
        <span className="hidden whitespace-nowrap text-xs tabular-nums text-slate-500 sm:inline">
          {templates.length > 0 ? `${templates.length} template${templates.length === 1 ? '' : 's'} · ${steps} steps` : 'No templates'}
        </span>
        <div className="flex items-center gap-0.5">
          <Link href={`${prefix}/services/sub-services/${ss.id}/clients`} className={iconBtn} title="Clients" aria-label={`Clients for ${ss.name}`}>
            <Users className="h-3.5 w-3.5" />
          </Link>
          <button type="button" onClick={() => setOpen((v) => !v)} className={cn(iconBtn, open && 'bg-slate-100 text-slate-900')} title="Task templates" aria-expanded={open} aria-label={`Task templates for ${ss.name}`}>
            <ListChecks className="h-3.5 w-3.5" />
          </button>
          <SubServiceDialog serviceId={ss.service_id} serviceName={ss.services?.name ?? ''} initial={ss}>
            <button type="button" className={iconBtn} title="Edit" aria-label={`Edit ${ss.name}`}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </SubServiceDialog>
        </div>
      </div>
      {open && (
        <div className="border-t border-[#E8EAEE] bg-slate-50/60 px-4 pb-3">
          <TaskTemplatePanel subService={ss} templates={templates} stepsByTemplate={stepsByTemplate} />
        </div>
      )}
    </li>
  );
}

export default function ServiceCard({ s, categories, subServices, templatesBySub, stepsByTemplate }: ServiceCardProps) {
  const subs = subServices.filter((ss) => ss.service_id === s.id);

  return (
    <div className="tff-card flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[#E8EAEE] px-4 py-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border', serviceKindColor(s.service_kind))}>
          {serviceKindIcon(s.service_kind)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">{s.name}</h3>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">{s.code}</span>
            <span>·</span>
            <span className="tabular-nums">{subs.length} sub-service{subs.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        <ServiceDialog categories={categories} initial={s}>
          <button type="button" className={iconBtn} title="Edit service" aria-label={`Edit ${s.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </ServiceDialog>
        <SubServiceDialog serviceId={s.id} serviceName={s.name}>
          <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md border border-[#DCDFE5] bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
            <Plus className="h-3.5 w-3.5" /> Sub-service
          </button>
        </SubServiceDialog>
      </div>

      {subs.length === 0 ? (
        <p className="px-4 py-4 text-xs text-slate-500">No sub-services yet. Add one to start creating tasks.</p>
      ) : (
        <ul>
          {subs.map((ss: any) => (
            <SubServiceRow key={ss.id} ss={ss} templates={templatesBySub[ss.id] ?? []} stepsByTemplate={stepsByTemplate} />
          ))}
        </ul>
      )}
    </div>
  );
}
