'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, CheckCircle2, type LucideIcon } from 'lucide-react';

export interface BulkActionOption {
  value: string;
  label: string;
}

export interface BulkActionConfig {
  type: 'select' | 'button';
  label: string;
  icon?: LucideIcon;
  options?: BulkActionOption[];
  variant?: 'default' | 'danger';
  onApply: (ids: string[], value?: string) => Promise<{ success: number; failed: number }>;
}

interface BulkActionsBarProps {
  ids: string[];
  onClear: () => void;
  actions: BulkActionConfig[];
  children?: React.ReactNode;
}

export default function BulkActionsBar({ ids, onClear, actions, children }: BulkActionsBarProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  if (ids.length === 0) return null;

  async function handleApply(config: BulkActionConfig) {
    const value = config.type === 'select' ? values[config.label] : undefined;
    if (config.type === 'select' && !value) return;

    startTransition(async () => {
      try {
        const result = await config.onApply(ids, value);
        if (result.failed === 0) {
          toast.success(`${config.label}: ${result.success} item${result.success !== 1 ? 's' : ''} updated`);
        } else {
          toast.warning(`${config.label}: ${result.success} updated · ${result.failed} failed`);
        }
      } catch (err: any) {
        toast.error(`${config.label} failed: ${err.message || 'Unknown error'}`);
      }
      onClear();
    });
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4">
      <div className="flex items-center gap-3 p-3 bg-teal-800 text-white rounded-2xl shadow-2xl border border-white/10" data-testid="bulk-bar">
        <div className="flex items-center gap-2 px-2 border-r border-white/10 mr-2">
          <CheckCircle2 className="h-4 w-4 text-teal-300" />
          <span className="text-sm font-semibold">{ids.length} selected</span>
        </div>

        <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {actions.map((action) => {
            if (action.type === 'select' && action.options) {
              return (
                <div key={action.label} className="flex items-center gap-1.5 shrink-0">
                  <Select
                    value={values[action.label] || ''}
                    onValueChange={(v) => setValues((prev) => ({ ...prev, [action.label]: v }))}
                  >
                    <SelectTrigger className="w-40 h-8 text-xs bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder={action.label} />
                    </SelectTrigger>
                    <SelectContent>
                      {action.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-teal-600 hover:bg-teal-500 text-white"
                    onClick={() => handleApply(action)}
                    disabled={pending || !values[action.label]}
                  >
                    Apply
                  </Button>
                </div>
              );
            }

            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                size="sm"
                className={
                  action.variant === 'danger'
                    ? 'h-8 text-xs bg-red-600 hover:bg-red-500 text-white shrink-0'
                    : 'h-8 text-xs bg-teal-600 hover:bg-teal-500 text-white shrink-0'
                }
                onClick={() => handleApply(action)}
                disabled={pending}
              >
                {Icon && <Icon className="h-3.5 w-3.5 mr-1" />}
                {action.label}
              </Button>
            );
          })}
          {children}
        </div>

        <Button
          onClick={onClear}
          variant="ghost"
          size="icon"
          className="text-white/60 hover:text-white hover:bg-white/10 shrink-0"
          aria-label="Clear selection"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
