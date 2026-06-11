'use client';

import { cn } from '@/lib/utils';

interface MicroBarSegment {
  label: string;
  value: number;
  color: string;
}

interface MicroBarChartProps {
  segments: MicroBarSegment[];
  total?: number;
  className?: string;
  onSegmentClick?: (label: string) => void;
}

export function MicroBarChart({ segments, total, className, onSegmentClick }: MicroBarChartProps) {
  const t = total ?? segments.reduce((sum, s) => sum + s.value, 0);
  if (t === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex h-4 w-full rounded-full overflow-hidden">
        {segments.map((s) => {
          const pct = (s.value / t) * 100;
          if (pct < 1) return null;
          return (
            <button
              key={s.label}
              onClick={() => onSegmentClick?.(s.label)}
              className="h-full transition-all hover:opacity-80 relative group"
              style={{ width: `${pct}%`, backgroundColor: s.color }}
              title={`${s.label}: ${s.value}`}
            >
              <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[9px] text-white font-medium transition-opacity">
                {s.value}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-zinc-500">{s.label} <span className="font-medium text-zinc-700 tabular-nums">{s.value}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
