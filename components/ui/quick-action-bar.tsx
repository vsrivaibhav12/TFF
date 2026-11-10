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
      {actions.map((action) => {
        const Icon = action.icon;
        const isDefault = action.variant === 'default' || !action.variant;
        return (
          <button
            key={action.label}
            onClick={action.onClick}
            className={cn(
              'flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2',
              isDefault
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300'
            )}
          >
            <Icon className={cn('h-4 w-4', isDefault ? 'text-white' : 'text-zinc-500')} />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
