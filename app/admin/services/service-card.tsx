'use client';
import {
  Calculator,
  Receipt,
  FileText,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Boxes,
  ChevronRight,
  ListChecks,
  Footprints,
} from 'lucide-react';
import ServiceDialog from './service-dialog';
import SubServiceDialog from './sub-service-dialog';
import TaskTemplatePanel from './task-template-panel';

export function serviceKindIcon(kind: string) {
  const map: Record<string, React.ReactNode> = {
    gst: <Calculator className="h-6 w-6" />,
    tds: <Receipt className="h-6 w-6" />,
    income_tax: <FileText className="h-6 w-6" />,
    compliance: <ShieldCheck className="h-6 w-6" />,
    bizlens: <BarChart3 className="h-6 w-6" />,
    vcfo: <TrendingUp className="h-6 w-6" />,
    notice: <AlertTriangle className="h-6 w-6" />,
    payroll: <Wallet className="h-6 w-6" />,
  };
  return map[kind] ?? <Boxes className="h-6 w-6" />;
}

export function serviceKindColor(kind: string): string {
  const map: Record<string, string> = {
    gst: 'bg-blue-50 text-blue-600 border-blue-100',
    tds: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    income_tax: 'bg-amber-50 text-amber-600 border-amber-100',
    compliance: 'bg-teal-50 text-teal-600 border-teal-100',
    bizlens: 'bg-purple-50 text-purple-600 border-purple-100',
    vcfo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    notice: 'bg-red-50 text-red-600 border-red-100',
    payroll: 'bg-rose-50 text-rose-600 border-rose-100',
  };
  return map[kind] ?? 'bg-zinc-50 text-zinc-500 border-zinc-100';
}

function frequencyColor(frequency: string): string {
  const map: Record<string, string> = {
    monthly: 'bg-blue-50 text-blue-600 border-blue-100',
    quarterly: 'bg-purple-50 text-purple-600 border-purple-100',
    annually: 'bg-amber-50 text-amber-600 border-amber-100',
    on_demand: 'bg-zinc-50 text-zinc-500 border-zinc-100',
  };
  return map[frequency] ?? 'bg-zinc-50 text-zinc-500 border-zinc-100';
}

interface ServiceCardProps {
  s: any;
  categories: any[];
  subServices: any[];
  templatesBySub: Record<string, any[]>;
  stepsByTemplate: Record<string, any[]>;
}

export default function ServiceCard({
  s,
  categories,
  subServices,
  templatesBySub,
  stepsByTemplate,
}: ServiceCardProps) {
  const subs = subServices.filter((ss) => ss.service_id === s.id);
  const icon = serviceKindIcon(s.service_kind);
  const colorCls = serviceKindColor(s.service_kind);

  const totalTemplates = subs.reduce(
    (sum, ss) => sum + (templatesBySub[ss.id]?.length ?? 0),
    0
  );
  const totalSteps = subs.reduce(
    (sum, ss) =>
      sum +
      (templatesBySub[ss.id] ?? []).reduce(
        (sSum, t) => sSum + (stepsByTemplate[t.id]?.length ?? 0),
        0
      ),
    0
  );

  return (
    <div className="tff-card p-5 group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
      {/* Header: icon + name */}
      <div className="flex items-start gap-3.5">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${colorCls} transition-transform duration-300 group-hover:scale-105`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-zinc-900 text-[15px] leading-snug group-hover:text-teal-700 transition-colors truncate">
                {s.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[10px] text-zinc-400">{s.code}</span>
                {s.service_kind && (
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded font-medium">
                    {s.service_kind.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
            <ServiceDialog categories={categories} initial={s}>
              <button className="text-[11px] text-zinc-400 hover:text-teal-700 font-medium transition-colors shrink-0">
                Edit
              </button>
            </ServiceDialog>
          </div>
        </div>
      </div>

      {/* Description */}
      {s.description && (
        <p className="text-xs text-zinc-500 mt-3 line-clamp-2 leading-relaxed">
          {s.description}
        </p>
      )}

      {/* Sub-services chips */}
      {subs.length === 0 ? (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 italic">No sub-services yet.</span>
          <SubServiceDialog serviceId={s.id} serviceName={s.name}>
            <button className="text-[11px] text-teal-700 hover:underline font-medium">
              + Add sub-service
            </button>
          </SubServiceDialog>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex flex-wrap gap-1.5">
            {subs.map((ss: any) => (
              <span
                key={ss.id}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border ${
                  ss.is_active
                    ? frequencyColor(ss.frequency)
                    : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                }`}
              >
                {ss.name}
                <span className="text-[9px] uppercase opacity-70">{ss.frequency}</span>
                {!ss.is_active && (
                  <span className="text-[9px] text-amber-600 font-medium">paused</span>
                )}
              </span>
            ))}
            <SubServiceDialog serviceId={s.id} serviceName={s.name}>
              <button className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-100 hover:bg-teal-100 transition-colors">
                +<span className="sr-only">Add sub-service</span>
              </button>
            </SubServiceDialog>
          </div>

          {/* Expandable sub-service details */}
          <div className="mt-3 space-y-2">
            {subs.slice(0, 3).map((ss: any) => (
              <div
                key={ss.id}
                className="rounded-xl bg-zinc-50/70 p-2.5 border border-zinc-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Footprints className="h-3 w-3 text-zinc-400 shrink-0" />
                    <span className="text-[13px] font-medium text-zinc-900 truncate">
                      {ss.name}
                    </span>
                    {!ss.is_active && (
                      <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                        inactive
                      </span>
                    )}
                  </div>
                  <SubServiceDialog
                    serviceId={ss.service_id}
                    serviceName={ss.services?.name ?? ''}
                    initial={ss}
                  >
                    <button className="text-[11px] text-zinc-400 hover:text-teal-700 font-medium transition-colors shrink-0">
                      Edit
                    </button>
                  </SubServiceDialog>
                </div>
                <TaskTemplatePanel
                  subService={ss}
                  templates={templatesBySub[ss.id] ?? []}
                  stepsByTemplate={stepsByTemplate}
                />
              </div>
            ))}
            {subs.length > 3 && (
              <div className="text-[11px] text-zinc-400 pl-1">
                + {subs.length - 3} more sub-services
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer stats */}
      <div className="mt-auto pt-4 flex items-center justify-between border-t border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
            <ListChecks className="h-3 w-3" />
            <span className="font-medium">{subs.length}</span> sub-services
          </div>
          {totalTemplates > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              <Footprints className="h-3 w-3" />
              <span className="font-medium">{totalSteps}</span> steps
            </div>
          )}
        </div>
        <SubServiceDialog serviceId={s.id} serviceName={s.name}>
          <button className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:text-teal-800 transition-colors">
            Add work <ChevronRight className="h-3 w-3" />
          </button>
        </SubServiceDialog>
      </div>
    </div>
  );
}
