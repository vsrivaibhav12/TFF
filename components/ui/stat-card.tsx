import Link from 'next/link';
import { cn } from '@/lib/utils';

export type StatTone = 'default' | 'zinc' | 'red' | 'amber' | 'warning';

const ICON_TONE: Record<StatTone, string> = {
  default: 'bg-zinc-100 text-zinc-500',
  zinc: 'bg-zinc-100 text-zinc-600',
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600',
  warning: 'bg-amber-50 text-amber-600',
};

/**
 * One stat card for dashboards and list headers. A warning tone only shows
 * when there is something to warn about: a zero is never drawn in amber or red.
 */
export function StatCard({
  label,
  value,
  icon,
  href,
  tone = 'default',
  hint,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href?: string;
  tone?: StatTone;
  /** Short context line under the label, e.g. "of 1,184 clients". */
  hint?: string;
}) {
  const isZero = value === 0 || value === '0';
  const effective: StatTone = isZero ? 'default' : tone;
  const valueColor =
    effective === 'red' ? 'text-red-600' : effective === 'amber' || effective === 'warning' ? 'text-amber-600' : 'text-zinc-900';
  const body = (
    <div className="flex items-center gap-3">
      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', ICON_TONE[effective])}>{icon}</div>
      <div className="min-w-0">
        <div className={cn('text-2xl font-semibold tabular-nums tracking-tight leading-tight', valueColor)}>{value}</div>
        <div className="text-xs font-medium text-zinc-600">{label}</div>
        {hint && <div className="text-xs text-zinc-500 tabular-nums">{hint}</div>}
      </div>
    </div>
  );
  const cls = 'tff-card p-4 block transition-colors hover:border-zinc-300';
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}
