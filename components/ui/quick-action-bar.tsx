'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'secondary';
}

interface QuickActionBarProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActionBar({ actions, className }: QuickActionBarProps) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {actions.map((action, i) => {
        const Icon = action.icon;
        const isDefault = action.variant === 'default' || !action.variant;
        return (
          <button
            key={i}
            onClick={action.onClick}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200',
              isDefault
                ? 'bg-teal-800 text-white hover:bg-teal-700 shadow-sm'
                : 'bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300'
            )}
            style={isDefault ? {} : { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <Icon className={cn('h-3.5 w-3.5', isDefault ? 'text-teal-300' : 'text-zinc-400')} />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
