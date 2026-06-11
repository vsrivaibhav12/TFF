'use client';

import Link from 'next/link';
import { useRolePrefix } from '@/lib/hooks/use-role-prefix';
import { cn } from '@/lib/utils';

interface PrefixedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function PrefixedLink({ href, children, className, onClick }: PrefixedLinkProps) {
  const prefix = useRolePrefix();
  const fullHref = href.startsWith('/') ? `${prefix}${href}` : `${prefix}/${href}`;
  return (
    <Link href={fullHref} className={cn(className)} onClick={onClick}>
      {children}
    </Link>
  );
}
