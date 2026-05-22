'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Building2, MapPin, Phone, Mail } from 'lucide-react';

interface EnrichedClient {
  id: string;
  business_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  pan: string | null;
  gstin: string | null;
  city: string | null;
  state: string | null;
  portal_access_enabled: boolean;
  created_at: string;
  group_name: string | null;
  engagements: number;
  compliance: { gst: string; tds: string; it: string };
}

function ComplianceDot({ status }: { status: string }) {
  const color =
    status === 'filed' || status === 'completed' ? 'bg-teal-500' :
    status === 'overdue' ? 'bg-red-500' :
    status === 'in_progress' || status === 'processing' ? 'bg-amber-500' :
    'bg-zinc-200';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={status} />;
}

function ComplianceDots({ gst, tds, it }: { gst: string; tds: string; it: string }) {
  return (
    <div className="flex items-center gap-1.5" title={`GST: ${gst} | TDS: ${tds} | IT: ${it}`}>
      <span className="text-[10px] text-zinc-400 uppercase font-medium">G</span>
      <ComplianceDot status={gst} />
      <span className="text-[10px] text-zinc-400 uppercase font-medium ml-1">T</span>
      <ComplianceDot status={tds} />
      <span className="text-[10px] text-zinc-400 uppercase font-medium ml-1">I</span>
      <ComplianceDot status={it} />
    </div>
  );
}

export default function ClientsTableClient({ clients }: { clients: EnrichedClient[] }) {
  const [sortKey, setSortKey] = useState<'name' | 'engagements'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = [...clients].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.business_name.localeCompare(b.business_name);
    else if (sortKey === 'engagements') cmp = a.engagements - b.engagements;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        <button className="col-span-5 text-left flex items-center gap-1 hover:text-zinc-600 transition-colors" onClick={() => toggleSort('name')}>
          Client {sortKey === 'name' && (sortDir === 'asc' ? '▲' : '▼')}
        </button>
        <div className="col-span-2 text-left">Group</div>
        <div className="col-span-2 text-left">Compliance</div>
        <button className="col-span-2 text-left flex items-center gap-1 hover:text-zinc-600 transition-colors" onClick={() => toggleSort('engagements')}>
          Work {sortKey === 'engagements' && (sortDir === 'asc' ? '▲' : '▼')}
        </button>
        <div className="col-span-1 text-right">View</div>
      </div>

      {/* Table Rows */}
      <div className="space-y-2">
        {sorted.map((c) => (
          <Link
            key={c.id}
            href={`/admin/clients/${c.id}`}
            className="group grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-2xl bg-white transition-all duration-200 hover:shadow-md cursor-pointer"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            {/* Client info */}
            <div className="col-span-5 flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-zinc-900 truncate">{c.business_name}</div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                  {c.city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{c.city}</span>}
                  {c.contact_phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{c.contact_phone}</span>}
                  {c.contact_email && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" />{c.contact_email}</span>}
                </div>
              </div>
            </div>

            {/* Group */}
            <div className="col-span-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 text-[11px] font-medium text-zinc-600">
                {c.group_name ?? '—'}
              </span>
            </div>

            {/* Compliance dots */}
            <div className="col-span-2">
              <ComplianceDots gst={c.compliance.gst} tds={c.compliance.tds} it={c.compliance.it} />
            </div>

            {/* Engagements / Work count */}
            <div className="col-span-2">
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-semibold ${
                c.engagements > 0 ? 'bg-[#0D9488]/10 text-[#0D9488]' : 'bg-zinc-100 text-zinc-400'
              }`}>
                {c.engagements}
              </span>
            </div>

            {/* View arrow */}
            <div className="col-span-1 flex justify-end">
              <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-[#0D9488]/10 transition-colors">
                <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-[#0D9488] transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
