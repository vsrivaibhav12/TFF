'use client';

import { useState } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateIST } from '@/lib/utils';
import { Briefcase, Calendar, User, FileText } from 'lucide-react';
import useSWR from 'swr';

interface TaskPreview {
  title: string;
  sub_service_name: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  period_year: number | null;
  period_month: number | null;
  period_quarter: number | null;
  assignee_name: string | null;
  client_name: string | null;
  latest_note: string | null;
}

async function fetchTaskPreview(taskId: string): Promise<TaskPreview | null> {
  const res = await fetch(`/api/tasks/${taskId}/preview`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export function TaskHoverCard({ taskId, children }: { taskId: string; children: React.ReactNode }) {
  const [opened, setOpened] = useState(false);
  const { data, isLoading } = useSWR(
    opened ? ['task-preview', taskId] : null,
    () => fetchTaskPreview(taskId),
    { revalidateOnFocus: false }
  );

  return (
    <HoverCard openDelay={300} closeDelay={100} onOpenChange={(open) => open && setOpened(true)}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-80">
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
              <Briefcase className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium text-zinc-900 truncate">{data.sub_service_name ?? data.title}</span>
            </div>
            {data.client_name && (
              <p className="text-xs text-zinc-500">{data.client_name}</p>
            )}
            <div className="flex items-center gap-2">
              <Badge variant={data.status === 'completed' ? 'success' : data.status === 'in_progress' ? 'teal' : 'warning'} className="text-[10px]">
                {data.status.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="outline" className="text-[10px]">{data.priority}</Badge>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-600">
              {data.client_name && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-zinc-400" />
                  <span>{data.client_name}</span>
                </div>
              )}
              {data.assignee_name && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-zinc-400" />
                  <span>Assigned to {data.assignee_name}</span>
                </div>
              )}
              {data.due_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-zinc-400" />
                  <span>Due {formatDateIST(data.due_date)}</span>
                </div>
              )}
              {(data.period_year || data.period_month || data.period_quarter) && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-zinc-400" />
                  <span>
                    {data.period_month && data.period_year
                      ? `${new Date(data.period_year, data.period_month - 1).toLocaleString('default', { month: 'short' })} ${data.period_year}`
                      : data.period_quarter && data.period_year
                      ? `Q${data.period_quarter} ${data.period_year}`
                      : data.period_year
                      ? String(data.period_year)
                      : '—'}
                  </span>
                </div>
              )}
              {data.latest_note && (
                <div className="flex items-start gap-1.5 pt-1 border-t border-zinc-100">
                  <FileText className="h-3 w-3 text-zinc-400 mt-0.5" />
                  <span className="line-clamp-2 text-zinc-500">{data.latest_note}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
