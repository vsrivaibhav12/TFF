'use client';

import { ProgressRing } from '@/components/ui/progress-ring';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthMetric {
  label: string;
  status: 'good' | 'at_risk' | 'poor';
}

interface HealthScoreCardProps {
  score: number;
  metrics: HealthMetric[];
  subtitle?: string;
}

const statusConfig = {
  good: { icon: CheckCircle2, color: 'text-teal-400', bg: 'bg-teal-500/15', border: 'border-teal-500/20', label: 'Good' },
  at_risk: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20', label: 'At risk' },
  poor: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/20', label: 'Poor' },
};

export function HealthScoreCard({ score, metrics, subtitle = 'Your firm is performing well.' }: HealthScoreCardProps) {
  const statusText = score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Needs attention';
  const statusColor = score >= 80 ? 'text-teal-300' : score >= 60 ? 'text-amber-300' : 'text-red-300';

  return (
    <div className="rounded-2xl bg-teal-900 border border-teal-700/30 p-6 md:p-8 h-full flex flex-col text-white">
      <h3 className="text-lg font-semibold tracking-tight">Firm health score</h3>
      <p className="text-sm text-teal-200/50 mt-1">{subtitle}</p>

      <div className="flex flex-col items-center mt-6">
        <div className="relative" style={{ width: 140, height: 140 }}>
          <ProgressRing
            progress={score}
            size={140}
            strokeWidth={10}
            color="#2DD4BF"
            bgColor="rgba(45,212,191,0.12)"
            hideLabel
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-white tracking-tight">{score}</span>
            <span className={cn('text-xs font-medium mt-1', statusColor)}>{statusText}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-2.5">
        {metrics.map((m) => {
          const config = statusConfig[m.status];
          const Icon = config.icon;
          return (
            <div key={m.label} className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-white/5 border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className={cn('h-6 w-6 rounded-md flex items-center justify-center border', config.bg, config.border)}>
                  <Icon className={cn('h-3.5 w-3.5', config.color)} />
                </div>
                <span className="text-sm text-teal-50/90">{m.label}</span>
              </div>
              <span className={cn('text-xs font-semibold', config.color)}>{config.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
