'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { MiniSparkline } from './mini-sparkline';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; positive: boolean };
  delta?: { value: string; positive?: boolean };
  sparkline?: number[];
  variant?: 'default' | 'warning' | 'danger' | 'teal';
  className?: string;
  href?: string;
}

export function MetricCard({
  label,
  value,
  icon,
  trend,
  delta,
  sparkline,
  variant = 'default',
  className,
  href,
}: MetricCardProps) {
  const variantStyles = {
    default: 'bg-white border-zinc-200 hover:border-zinc-300',
    warning: 'bg-amber-50/40 border-amber-200/70 hover:border-amber-300',
    danger: 'bg-red-50/40 border-red-200/70 hover:border-red-300',
    teal: 'bg-teal-50/40 border-teal-200/70 hover:border-teal-300',
  };

  const iconBg = {
    default: 'bg-zinc-100 text-zinc-500',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
    teal: 'bg-teal-100 text-teal-600',
  };

  const sparkColors = {
    default: '#71717A',
    warning: '#D97706',
    danger: '#DC2626',
    teal: '#0D9488',
  };

  const content = (
    <>
      <div className="flex items-start justify-between">
        {icon && (
          <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', iconBg[variant])}>
            {icon}
          </div>
        )}
        {sparkline && sparkline.length >= 2 && (
          <MiniSparkline data={sparkline} color={sparkColors[variant]} width={64} height={20} />
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tabular-nums tracking-tight text-zinc-900">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mt-1">{label}</div>
      </div>
      {(trend || delta) && (
        <div className="mt-2 flex items-center gap-1.5">
          {trend && (
            <span className={cn('text-xs font-medium', trend.positive ? 'text-teal-600' : 'text-red-600')}>
              {trend.positive ? '↑' : '↓'} {trend.value}%
            </span>
          )}
          {delta && (
            <span className={cn(
              'text-xs font-medium',
              delta.positive === true ? 'text-teal-600' : delta.positive === false ? 'text-red-600' : 'text-zinc-400'
            )}>
              {delta.value}
            </span>
          )}
        </div>
      )}
    </>
  );

  const cls = cn(
    'rounded-xl border p-5 transition-all duration-200 hover:shadow-sm',
    href ? 'cursor-pointer' : '',
    variantStyles[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }

  return <div className={cls}>{content}</div>;
}
