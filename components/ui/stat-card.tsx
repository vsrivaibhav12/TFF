import Link from 'next/link';
import { cn } from '@/lib/utils';

export type StatTone = 'default' | 'zinc' | 'red' | 'amber' | 'warning';

const ICON_TONE: Record<StatTone, string> = {
  default: 'bg-zinc-100 text-zinc-500',
  zinc: 'bg-zinc-100 text-zinc-600',
  red: 'bg-red-100 text-red-600',
  amber: 'bg-amber-100 text-amber-600',
  warning: 'bg-amber-100 text-amber-600',
};

/**
 * One stat card for dashboards and list headers. Replaces the three slightly
 * different copies that lived in the admin dashboard and the task pages.
 */
export function StatCard({
  label,
  value,
  icon,
  href,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href?: string;
  tone?: StatTone;
}) {
  const warn = tone === 'warning' || tone === 'amber';
  const body = (
    <div className="flex items-center gap-3">
      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', ICON_TONE[tone])}>{icon}</div>
      <div className="min-w-0">
        <div className={cn('text-2xl font-semibold tabular-nums tracking-tight', warn ? 'text-amber-600' : 'text-zinc-900')}>{value}</div>
        <div className="text-xs font-medium text-zinc-500">{label}</div>
      </div>
    </div>
  );
  const cls = 'tff-card p-4 block transition-colors hover:border-zinc-300';
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}
