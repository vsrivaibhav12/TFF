'use client';

import { useState, useEffect } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Briefcase, AlertTriangle, ShieldCheck } from 'lucide-react';

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
  const [data, setData] = useState<ClientPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (opened && !data && !loading) {
      setLoading(true);
      fetchClientPreview(clientId)
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [opened, data, loading, clientId]);

  return (
    <HoverCard openDelay={300} closeDelay={100} onOpenChange={(open) => open && setOpened(true)}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-72">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        )}
        {!loading && !data && (
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
