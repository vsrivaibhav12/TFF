'use client';

import { cn } from '@/lib/utils';

interface ComplianceHealthProps {
  gst: string;
  tds: string;
  it: string;
  showLabel?: boolean;
  className?: string;
}

function scoreFor(status: string): number {
  const s = status.toLowerCase();
  if (s === 'filed' || s === 'completed') return 1;
  if (s === 'in_progress' || s === 'processing') return 0.5;
  if (s === 'unknown') return 0.5;
  return 0;
}

export function computeComplianceHealth(gst: string, tds: string, it: string): number {
  const total = scoreFor(gst) + scoreFor(tds) + scoreFor(it);
  return Math.round((total / 3) * 100);
}

export function ComplianceHealthBar({ gst, tds, it, showLabel = true, className }: ComplianceHealthProps) {
  const score = computeComplianceHealth(gst, tds, it);
  const tone = score >= 80 ? 'good' : score >= 60 ? 'fair' : 'poor';

  const config = {
    good: { bar: 'bg-teal-500', text: 'text-teal-700', label: 'Good' },
    fair: { bar: 'bg-amber-500', text: 'text-amber-700', label: 'Fair' },
    poor: { bar: 'bg-red-500', text: 'text-red-700', label: 'At risk' },
  }[tone];

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 rounded-full bg-zinc-100 overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', config.bar)} style={{ width: `${score}%` }} />
        </div>
        {showLabel && (
          <span className={cn('text-[10px] font-medium tabular-nums', config.text)}>
            {config.label} ({score}%)
          </span>
        )}
      </div>
    </div>
  );
}
