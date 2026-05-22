'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CalendarX } from 'lucide-react';

interface Deadline {
  id: string;
  due_date: string;
  rule_code?: string;
  period_label?: string;
  status: string;
  clients?: { business_name: string } | { business_name: string }[] | null;
  compliance_calendar_rules?: { display_name?: string | null; service_kind?: string | null } | { display_name?: string | null; service_kind?: string | null }[] | null;
}

interface DeadlineTimelineProps {
  deadlines: Deadline[];
  href?: string;
  emptyMessage?: string;
}

function daysLeft(dueDate: string): string {
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff} days`;
}

function dayLabelColor(dueDate: string): string {
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return 'text-red-600 bg-red-50 border-red-100';
  if (diff === 0) return 'text-red-600 bg-red-50 border-red-100';
  if (diff <= 3) return 'text-amber-600 bg-amber-50 border-amber-100';
  return 'text-zinc-600 bg-zinc-50 border-zinc-200';
}

function clientName(d: Deadline): string {
  const c = d.clients;
  if (!c) return '';
  if (Array.isArray(c)) return c[0]?.business_name ?? '';
  return c.business_name ?? '';
}

function ruleName(d: Deadline): string {
  const r = d.compliance_calendar_rules;
  if (!r) return d.rule_code ?? 'Unknown';
  const rules = Array.isArray(r) ? r[0] : r;
  return rules?.display_name ?? d.rule_code ?? 'Unknown';
}

export function DeadlineTimeline({ deadlines, href = '/admin/compliance', emptyMessage = 'No upcoming deadlines' }: DeadlineTimelineProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 tracking-tight">Upcoming deadlines</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Next 7 days</p>
        </div>
        <Link href={href} className="text-xs text-teal-700 hover:underline font-medium inline-flex items-center gap-1">
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {deadlines.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
          <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center mb-3 border border-zinc-100">
            <CalendarX className="h-5 w-5 text-zinc-300" />
          </div>
          <p className="text-sm text-zinc-400 font-medium">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deadlines.map((d) => {
            const date = new Date(d.due_date);
            const day = date.getDate();
            const month = date.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
            return (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-100 p-3 hover:border-teal-200 hover:bg-teal-50/30 transition-all"
              >
                <div className={`h-10 w-10 rounded-lg flex flex-col items-center justify-center shrink-0 border ${dayLabelColor(d.due_date)}`}>
                  <span className="text-[9px] font-bold leading-none">{month}</span>
                  <span className="text-sm font-bold leading-tight">{day}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {ruleName(d)}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {clientName(d)} · {d.period_label}
                  </div>
                </div>
                <Badge variant={d.status === 'filed' ? 'success' : d.status === 'overdue' ? 'danger' : 'warning'} className="text-[10px] shrink-0">
                  {daysLeft(d.due_date)}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
