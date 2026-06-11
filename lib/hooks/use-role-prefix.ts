'use client';

import { usePathname } from 'next/navigation';

export function useRolePrefix(): string {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return '/admin';
  if (pathname?.startsWith('/team')) return '/team';
  return '/team';
}

export function usePrefixedPath(path: string): string {
  const prefix = useRolePrefix();
  if (path.startsWith('/')) return `${prefix}${path}`;
  return `${prefix}/${path}`;
}
