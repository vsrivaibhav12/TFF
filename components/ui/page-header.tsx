'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showBreadcrumbs?: boolean;
}

export function PageHeader({ title, subtitle, actions, showBreadcrumbs = true }: PageHeaderProps) {
  const pathname = usePathname();
  const role = pathname.split('/')[1] || '';
  const segments = pathname.split('/').filter(Boolean).slice(1);

  return (
    <div className="space-y-2">
      {showBreadcrumbs && segments.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-zinc-500 md:hidden">
          <Link href={`/${role}`} className="hover:text-zinc-900 transition-colors capitalize">
            {role}
          </Link>
          {segments.map((segment, i) => (
            <span key={`${segment}-${i}`} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
              <span
                className={cn(
                  'capitalize',
                  i === segments.length - 1
                    ? 'text-zinc-900 font-medium'
                    : 'hover:text-zinc-900 transition-colors'
                )}
              >
                {segment.replace(/-/g, ' ').replace(/_/g, ' ')}
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
