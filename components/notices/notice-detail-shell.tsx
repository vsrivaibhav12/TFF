'use client';

import { Badge } from '@/components/ui/badge';
import { formatDateIST, formatCurrencyINR } from '@/lib/utils';
import { Building2, Calendar, FileText, User, Gavel, Clock, ArrowUpRight } from 'lucide-react';
import { DockLink } from '@/components/shell/dock-link';

interface Notice {
  id: string;
  client_id: string;
  notice_type: string;
  notice_number: string | null;
  issuing_authority: string | null;
  notice_date: string | null;
  notice_received_date: string | null;
  due_date: string | null;
  status: string;
  amount_involved: number | null;
  subject: string | null;
  description: string | null;
  assigned_to: string | null;
  clients: { business_name: string } | null;
  users_profile: { full_name: string; email: string } | null;
}

interface Hearing {
  id: string;
  hearing_type: string;
  hearing_scheduled_date: string | null;
  hearing_held_date: string | null;
  next_hearing_date: string | null;
  status: string;
  venue: string | null;
  officer_name: string | null;
  subject: string | null;
  order_amount: number | null;
  order_date: string | null;
}

interface Props {
  notice: Notice;
  hearings: Hearing[];
  auditLogs?: any[];
  isModal?: boolean;
  clientBasePath?: string;
}

function statusBadgeVariant(status: string) {
  if (status === 'closed') return 'success';
  if (status === 'received') return 'secondary';
  if (status === 'reply_pending' || status === 'hearing_pending' || status === 'order_pending') return 'warning';
  return 'default';
}

function hearingStatusVariant(status: string) {
  if (status === 'concluded') return 'success';
  if (status === 'held') return 'secondary';
  if (status === 'adjourned') return 'warning';
  return 'default';
}

export default function NoticeDetailShell({ notice, hearings, isModal, clientBasePath = '/admin/clients' }: Props) {
  return (
    <div className="space-y-6 px-2 md:px-4 py-4 min-h-full">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{notice.notice_type}</Badge>
          <Badge variant={statusBadgeVariant(notice.status) as any}>{notice.status.replace(/_/g, ' ')}</Badge>
        </div>
        <h1 className="text-lg font-semibold text-zinc-900">{notice.subject ?? 'Untitled notice'}</h1>
        {notice.notice_number && (
          <p className="text-sm text-zinc-500 font-mono">{notice.notice_number}</p>
        )}
      </div>

      {/* Client link */}
      <DockLink
        item={{ type: 'client', id: notice.client_id }}
        href={`${clientBasePath}/${notice.client_id}`}
        className="flex items-center gap-2 p-3 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-colors"
      >
        <Building2 className="h-4 w-4 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-900">{notice.clients?.business_name ?? 'Unknown client'}</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 ml-auto" />
      </DockLink>

      {/* Key details grid */}
      <div className="grid grid-cols-2 gap-3">
        <DetailItem icon={Calendar} label="Notice date" value={formatDateIST(notice.notice_date)} />
        <DetailItem icon={Clock} label="Received" value={formatDateIST(notice.notice_received_date)} />
        <DetailItem icon={Calendar} label="Due date" value={formatDateIST(notice.due_date)} />
        <DetailItem icon={User} label="Assigned to" value={notice.users_profile?.full_name ?? '—'} />
        <DetailItem icon={FileText} label="Authority" value={notice.issuing_authority ?? '—'} />
        <DetailItem icon={FileText} label="Amount" value={formatCurrencyINR(notice.amount_involved, { compact: true })} />
      </div>

      {/* Description */}
      {notice.description && (
        <div className="p-3 rounded-xl border border-zinc-200 bg-white">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Description</h3>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{notice.description}</p>
        </div>
      )}

      {/* Hearings */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
          <Gavel className="h-3.5 w-3.5" />
          Hearings ({hearings.length})
        </h3>
        {hearings.length === 0 ? (
          <p className="text-sm text-zinc-500">No hearings scheduled.</p>
        ) : (
          <div className="space-y-2">
            {hearings.map((h) => (
              <div key={h.id} className="p-3 rounded-xl border border-zinc-200 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-900">{h.subject ?? h.hearing_type}</span>
                  <Badge variant={hearingStatusVariant(h.status) as any}>{h.status}</Badge>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                  {h.hearing_scheduled_date && <span>Scheduled: {formatDateIST(h.hearing_scheduled_date)}</span>}
                  {h.venue && <span>Venue: {h.venue}</span>}
                  {h.officer_name && <span>Officer: {h.officer_name}</span>}
                </div>
                {h.order_amount != null && (
                  <div className="mt-1 text-xs text-zinc-700">
                    Order amount: {formatCurrencyINR(h.order_amount)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-xl border border-zinc-200 bg-white">
      <Icon className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
      <div>
        <div className="text-[11px] text-zinc-400 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-medium text-zinc-900">{value}</div>
      </div>
    </div>
  );
}
