'use client';

import { useState } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Briefcase, AlertTriangle, ShieldCheck } from 'lucide-react';
import useSWR from 'swr';

interface ClientPreview {
  business_name: string;
  open_work_count: number;
  compliance_score: number | null;
  primary_contact_name: string | null;
}

async function fetchClientPreview(clientId: string): Promise<ClientPreview | null> {
  try {
    const res = await fetch(`/api/clients/${clientId}/preview`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function ClientHoverCard({ clientId, children }: { clientId: string; children: React.ReactNode }) {
  const [opened, setOpened] = useState(false);
  const { data, isLoading } = useSWR(
    opened ? ['client-preview', clientId] : null,
    () => fetchClientPreview(clientId),
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
              <Users className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium text-zinc-900 truncate">{data.business_name}</span>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-600">
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-3 w-3 text-zinc-400" />
                <span>{data.open_work_count} open work items</span>
              </div>
              {data.compliance_score !== null && (
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-zinc-400" />
                  <span>Compliance score: {data.compliance_score}%</span>
                </div>
              )}
              {data.primary_contact_name && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-zinc-400" />
                  <span>Contact: {data.primary_contact_name}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
