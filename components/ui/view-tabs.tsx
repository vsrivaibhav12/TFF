import Link from 'next/link';
import { cn } from '@/lib/utils';

export type ViewTab = {
  key: string;
  label: string;
  count?: number;
  href: string;
  active: boolean;
  tone?: 'danger' | 'warning';
};

/** Saved views as underlined tabs with a count chip. Each tab is a link that sets URL filters. */
export function ViewTabs({ tabs, label = 'Views' }: { tabs: ViewTab[]; label?: string }) {
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto border-b border-[#E8EAEE]">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.active ? 'true' : undefined}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors',
            t.active ? 'border-teal-600 font-medium text-slate-900' : 'border-transparent text-slate-600 hover:text-slate-900',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={cn(
                'rounded-full border px-2 text-xs tabular-nums',
                t.count > 0 && t.tone === 'danger'
                  ? 'border-red-100 bg-red-50 text-red-600'
                  : t.count > 0 && t.tone === 'warning'
                    ? 'border-amber-100 bg-amber-50 text-amber-700'
                    : 'border-[#E8EAEE] bg-slate-50 text-slate-500',
              )}
            >
              {t.count.toLocaleString('en-IN')}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
