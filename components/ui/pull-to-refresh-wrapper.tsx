'use client';

import { useRouter } from 'next/navigation';
import { PullToRefresh } from './pull-to-refresh';

export function PullToRefreshWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();
  return (
    <PullToRefresh onRefresh={async () => router.refresh()} className={className}>
      {children}
    </PullToRefresh>
  );
}
