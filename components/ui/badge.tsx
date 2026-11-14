import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors border border-transparent',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-700 before:content-[""] before:block before:w-1.5 before:h-1.5 before:rounded-full before:bg-zinc-400',
        teal: 'bg-[#E6F6F3] text-[#0B6B62] before:content-[""] before:block before:w-1.5 before:h-1.5 before:rounded-full before:bg-teal-500',
        success: 'bg-[#E7F6EC] text-green-700 before:content-[""] before:block before:w-1.5 before:h-1.5 before:rounded-full before:bg-emerald-500',
        warning: 'bg-[#FDF3DC] text-amber-700 before:content-[""] before:block before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-500',
        danger: 'bg-[#FDECEC] text-red-600 before:content-[""] before:block before:w-1.5 before:h-1.5 before:rounded-full before:bg-rose-500',
        destructive: 'bg-[#FDECEC] text-red-600 before:content-[""] before:block before:w-1.5 before:h-1.5 before:rounded-full before:bg-rose-500',
        outline: 'text-zinc-700 border-zinc-200 before:hidden',
        ghost: 'text-zinc-500 before:hidden',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
