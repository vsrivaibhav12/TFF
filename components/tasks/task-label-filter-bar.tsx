'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tag, X } from 'lucide-react';

export interface TaskLabelFilter {
  code: string;
  display_name: string;
  color_hex: string | null;
}

interface TaskLabelFilterBarProps {
  labels: TaskLabelFilter[];
}

export function TaskLabelFilterBar({ labels }: TaskLabelFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeLabels = searchParams.getAll('label');

  function toggleLabel(code: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll('label');
    if (current.includes(code)) {
      // Remove this label
      params.delete('label');
      current.filter((c) => c !== code).forEach((c) => params.append('label', c));
    } else {
      params.append('label', code);
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('label');
    router.push(`${pathname}?${params.toString()}`);
  }

  if (labels.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-xs text-zinc-400">
        <Tag className="h-3 w-3" />
      </div>
      {labels.map((l) => {
        const isActive = activeLabels.includes(l.code);
        return (
          <button
            key={l.code}
            onClick={() => toggleLabel(l.code)}
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all',
              isActive
                ? 'ring-1 ring-offset-1'
                : 'opacity-70 hover:opacity-100'
            )}
            style={{
              backgroundColor: isActive
                ? (l.color_hex ? l.color_hex + '25' : '#f4f4f5')
                : (l.color_hex ? l.color_hex + '10' : '#fafafa'),
              borderColor: isActive
                ? (l.color_hex || '#d4d4d8')
                : (l.color_hex ? l.color_hex + '30' : '#e4e4e7'),
              color: l.color_hex || '#52525b',
              '--tw-ring-color': l.color_hex || '#a1a1aa',
            } as React.CSSProperties}
            title={isActive ? 'Click to remove filter' : 'Click to filter by this tag'}
          >
            {l.display_name}
            {isActive && <X className="h-2.5 w-2.5 ml-0.5" />}
          </button>
        );
      })}
      {activeLabels.length > 0 && (
        <button
          onClick={clearAll}
          className="text-[11px] text-zinc-400 hover:text-zinc-600 underline"
        >
          Clear tags
        </button>
      )}
    </div>
  );
}
