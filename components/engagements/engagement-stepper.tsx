'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface Step {
  label: string;
  description?: string;
}

interface EngagementStepperProps {
  currentStep: number;
  steps?: Step[];
  status?: 'active' | 'churned' | 'prospect';
}

const DEFAULT_STEPS: Step[] = [
  { label: 'Lead', description: 'Prospect' },
  { label: 'Onboarded', description: 'CaaS active' },
  { label: 'Advisory', description: 'BizLens / vCFO' },
  { label: 'Full suite', description: 'Engaged' },
];

export function EngagementStepper({ currentStep, steps = DEFAULT_STEPS, status = 'active' }: EngagementStepperProps) {
  const isChurned = status === 'churned';

  return (
    <div className="w-full">
      <div className="flex items-start justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-zinc-100 -z-0" />
        {!isChurned && currentStep > 0 && (
          <div
            className="absolute top-4 left-0 h-0.5 bg-teal-500 -z-0 transition-all"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />
        )}

        {steps.map((step, idx) => {
          const isCompleted = !isChurned && idx < currentStep;
          const isCurrent = !isChurned && idx === currentStep;
          const isUpcoming = !isChurned && idx > currentStep;

          return (
            <div key={step.label} className="relative z-10 flex flex-col items-center gap-2 flex-1">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors',
                  isChurned
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : isCompleted
                      ? 'bg-teal-500 border-teal-500 text-white'
                      : isCurrent
                        ? 'bg-white border-teal-500 text-teal-600'
                        : 'bg-white border-zinc-200 text-zinc-300'
                )}
              >
                {isChurned ? (
                  <AlertCircle className="h-4 w-4" />
                ) : isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <div className="text-center">
                <div
                  className={cn(
                    'text-xs font-semibold',
                    isChurned ? 'text-red-600' : isCurrent ? 'text-teal-700' : isCompleted ? 'text-zinc-700' : 'text-zinc-400'
                  )}
                >
                  {step.label}
                </div>
                {step.description && (
                  <div className="text-[10px] text-zinc-400 mt-0.5">{step.description}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
