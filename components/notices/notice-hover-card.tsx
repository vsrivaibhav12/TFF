'use client';

import { useState } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateIST } from '@/lib/utils';
import { ScrollText, Calendar, Building2, AlertTriangle } from 'lucide-react';
import useSWR from 'swr';

interface NoticePreview {
  subject: string;
  notice_type: string;
  authority: string | null;
  due_date: string | null;
  status: string;
  client_name: string | null;
}

async function fetchNoticePreview(noticeId: string): Promise<NoticePreview | null> {
  try {
    const res = await fetch(`/api/notices/${noticeId}/preview`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function NoticeHoverCard({ noticeId, children }: { noticeId: string; children: React.ReactNode }) {
  const [opened, setOpened] = useState(false);
  const { data, isLoading } = useSWR(
    opened ? ['notice-preview', noticeId] : null,
    () => fetchNoticePreview(noticeId),
    { revalidateOnFocus: false }
  );

  return (
    <HoverCard openDelay={300} closeDelay={100} onOpenChange={(open) => open && setOpened(true)}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-72">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        )}
        {!isLoading && !data && (
          <div className="text-sm text-zinc-500">Unable to load preview.</div>
        )}
        {data && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium text-zinc-900 truncate">{data.subject}</span>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-600">
              {data.client_name && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-zinc-400" />
                  <span>{data.client_name}</span>
                </div>
              )}
              {data.authority && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-zinc-400" />
                  <span>{data.authority}</span>
                </div>
              )}
              {data.due_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-zinc-400" />
                  <span>Due {formatDateIST(data.due_date)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex h-2 w-2 rounded-full ${data.status === 'open' ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="capitalize">{data.status}</span>
              </div>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
