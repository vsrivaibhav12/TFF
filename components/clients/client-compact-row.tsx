'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';
import { Building2, Globe, MapPin } from 'lucide-react';

interface ClientCompactRowProps {
  client: {
    id: string;
    business_name: string;
    pan: string | null;
    gstin: string | null;
    portal_enabled: boolean;
    city: string | null;
    created_at: string;
    group_name?: string | null;
  };
  hrefPrefix?: string;
}

export function ClientCompactRow({ client, hrefPrefix = '/admin/clients' }: ClientCompactRowProps) {
  return (
    <Link
      href={`${hrefPrefix}/${client.id}`}
      className="group flex items-center gap-4 rounded-xl border border-zinc-100 bg-white p-4 hover:border-teal-200 hover:bg-teal-50/20 transition-all"
    >
      {/* Avatar */}
      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 flex items-center justify-center shrink-0">
        <Building2 className="h-5 w-5 text-teal-600" />
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate group-hover:text-teal-700 transition-colors">
            {client.business_name}
          </span>
          {client.group_name && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              {client.group_name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
          <span className="font-mono">{client.pan ?? '—'}</span>
          {client.gstin && <span className="font-mono">{client.gstin}</span>}
          {client.city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {client.city}
            </span>
          )}
        </div>
      </div>

      {/* Portal indicator */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <Globe className={client.portal_enabled ? 'h-3.5 w-3.5 text-teal-500' : 'h-3.5 w-3.5 text-zinc-300'} />
        <span className="text-[10px] text-zinc-400">{client.portal_enabled ? 'Portal on' : 'Portal off'}</span>
      </div>

      {/* Date */}
      <div className="hidden lg:block text-xs text-zinc-400 shrink-0 w-24 text-right">
        {formatDateIST(client.created_at)}
      </div>
    </Link>
  );
}
