import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold tracking-wide transition-colors border border-transparent',
  {
    variants: {
      variant: {
        default: 'text-stone-700 before:content-[""] before:block before:w-1.5 before:h-1.5 before:rounded-full before:bg-stone-400',
        teal: 'text-teal-800 before:content-[""] before:block before:w-1.5 before:h-1.5 before:rounded-full before:bg-teal-500',
        success: 'text-emerald-800 before:content-[""] before:block before:w-1.5 before:h-1.5 before:rounded-full before:bg-emerald-500',
        warning: 'text-amber-800 before:content-[""] before:block before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-500',
        danger: 'text-rose-800 before:content-[""] before:block before:w-1.5 before:h-1.5 before:rounded-full before:bg-rose-500',
        destructive: 'text-rose-800 before:content-[""] before:block before:w-1.5 before:h-1.5 before:rounded-full before:bg-rose-500',
        outline: 'text-stone-700 border-stone-200 before:hidden',
        ghost: 'text-stone-500 before:hidden',
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
