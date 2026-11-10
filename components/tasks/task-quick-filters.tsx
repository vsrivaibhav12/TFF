'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

type Preset = { key: string; label: string; params: Record<string, string> };

/**
 * One-click filter chips for the task list. Each chip sets URL params, so the
 * filtered view can be bookmarked and shared like any other filter.
 */
export function TaskQuickFilters({
  meId,
  todayIso,
  weekEndIso,
  yesterdayIso,
}: {
  meId: string;
  todayIso: string;
  weekEndIso: string;
  yesterdayIso: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const presets: Preset[] = [
    { key: 'mine', label: 'My tasks', params: { assigned: meId } },
    { key: 'overdue', label: 'Overdue', params: { due_to: yesterdayIso } },
    { key: 'week', label: 'Due this week', params: { due_from: todayIso, due_to: weekEndIso } },
    { key: 'stuck', label: 'Stuck', params: { is_stuck: 'true' } },
  ];

  const isActive = (p: Preset) => Object.entries(p.params).every(([k, v]) => sp.get(k) === v);

  function toggle(p: Preset) {
    const next = new URLSearchParams(sp.toString());
    if (isActive(p)) {
      Object.keys(p.params).forEach((k) => next.delete(k));
    } else {
      Object.entries(p.params).forEach(([k, v]) => next.set(k, v));
    }
    next.delete('page');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick filters">
      {presets.map((p) => {
        const active = isActive(p);
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => toggle(p)}
            aria-pressed={active}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-teal-600 bg-teal-50 text-teal-700'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
