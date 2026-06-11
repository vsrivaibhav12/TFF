'use client';

import { cn } from '@/lib/utils';

export interface TaskLabel {
  code: string;
  display_name: string;
  color_hex: string | null;
}

interface TaskLabelPillsProps {
  labels: TaskLabel[] | undefined;
  maxVisible?: number;
  size?: 'sm' | 'xs';
  className?: string;
}

export function TaskLabelPills({ labels, maxVisible = 3, size = 'xs', className }: TaskLabelPillsProps) {
  if (!labels || labels.length === 0) return null;

  const visible = labels.slice(0, maxVisible);
  const overflow = labels.length - maxVisible;

  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-[11px]'
    : 'px-1 py-[1px] text-[10px]';

  return (
    <span className={cn('inline-flex items-center gap-1 flex-nowrap overflow-hidden', className)}>
      {visible.map((l) => (
        <span
          key={l.code}
          className={cn('inline-flex items-center rounded font-medium border', sizeClasses)}
          style={{
            backgroundColor: l.color_hex ? l.color_hex + '18' : '#f4f4f5',
            borderColor: l.color_hex ? l.color_hex + '40' : '#e4e4e7',
            color: l.color_hex || '#52525b',
          }}
          title={l.display_name}
        >
          {l.display_name}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-zinc-400">+{overflow}</span>
      )}
    </span>
  );
}
