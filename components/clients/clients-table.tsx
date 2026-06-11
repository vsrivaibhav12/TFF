'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Building2, MapPin, Phone, Mail, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EnrichedClient {
  id: string;
  business_name: string;
  primary_contact_person: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  pan: string | null;
  gstin: string | null;
  city: string | null;
  state: string | null;
  portal_enabled: boolean;
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

export default function ClientsTable({
  clients,
  basePath,
  selectable = false,
  selected = new Set(),
  onToggle,
  onToggleAll,
  bulkActions,
}: {
  clients: EnrichedClient[];
  basePath: string;
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: () => void;
  bulkActions?: React.ReactNode;
}) {
  const [sortKey, setSortKey] = useState<'name' | 'engagements'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = [...clients].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.business_name.localeCompare(b.business_name);
    if (sortKey === 'engagements') cmp = a.engagements - b.engagements;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const allSelected = sorted.length > 0 && selected.size === sorted.length;

  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 items-center">
        {selectable && (
          <div className="col-span-1">
            <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          </div>
        )}
        <button className={`${selectable ? 'col-span-4' : 'col-span-5'} text-left flex items-center gap-1 hover:text-zinc-600 transition-colors`} onClick={() => toggleSort('name')}>
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
          <div
            key={c.id}
            className={`group grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center px-4 py-3 rounded-2xl bg-white transition-all duration-200 hover:border-zinc-300 cursor-pointer ${selected.has(c.id) ? 'ring-1 ring-teal-200 bg-teal-50/40' : ''}`}
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            {selectable && (
              <div className="col-span-1 flex items-center">
                <Checkbox checked={selected.has(c.id)} onCheckedChange={() => onToggle?.(c.id)} aria-label={`Select ${c.business_name}`} />
              </div>
            )}
            {/* Client info */}
            <div className={`md:${selectable ? 'col-span-4' : 'col-span-5'} flex items-center gap-3 min-w-0`}>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <Link href={`${basePath}/${c.id}`} className="text-[13px] font-semibold text-zinc-900 truncate hover:text-teal-700">
                  {c.business_name}
                </Link>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                  {c.city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{c.city}</span>}
                  {c.primary_contact_phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{c.primary_contact_phone}</span>}
                  {c.primary_contact_email && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" />{c.primary_contact_email}</span>}
                </div>
              </div>
            </div>

            {/* Group */}
            <div className="md:col-span-2 hidden md:block">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 text-[11px] font-medium text-zinc-600">
                {c.group_name ?? '—'}
              </span>
            </div>

            {/* Compliance dots */}
            <div className="md:col-span-2 hidden md:block">
              <ComplianceDots gst={c.compliance.gst} tds={c.compliance.tds} it={c.compliance.it} />
            </div>

            {/* Engagements / Work count */}
            <div className="md:col-span-2 hidden md:block">
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-semibold ${
                c.engagements > 0 ? 'bg-teal-50 text-teal-600' : 'bg-zinc-100 text-zinc-400'
              }`}>
                {c.engagements}
              </span>
            </div>

            {/* View arrow */}
            <div className="md:col-span-1 flex justify-end hidden md:block">
              <Link href={`${basePath}/${c.id}`} className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-[#0D9488] transition-colors" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {bulkActions}
    </div>
  );
}
