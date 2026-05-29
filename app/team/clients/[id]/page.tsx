import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getClientById } from '@/lib/repositories/clients';
import { listClientSubServices } from '@/lib/repositories/services';
import { listTasks, enrichTasksWithProgress } from '@/lib/repositories/tasks';
import { listAllNotices } from '@/lib/repositories/notices';
import { listQueries } from '@/lib/repositories/queries';
import { listEntityAuditLogs } from '@/lib/repositories/audit';
import { getCurrentUser } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import AuditTimeline from '@/components/sophistication/audit-timeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/ui/progress-ring';
import { ChevronLeft, Building2, MapPin, Phone, Mail, FileText, AlertTriangle, MessageSquare, Briefcase, ArrowRight, TrendingUp, Pencil } from 'lucide-react';
import { formatDateIST } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function statusBadgeClass(status: string) {
  if (['completed','filed','resolved','closed'].includes(status)) return 'bg-teal-50 text-teal-700 border-teal-200';
  if (['in_progress','processing','open','pending'].includes(status)) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (['overdue','urgent','stuck','blocked'].includes(status)) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-zinc-50 text-zinc-600 border-zinc-200';
}

export default async function TeamClientDetail({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  const canEdit = me ? await hasCapability(me, 'clients.edit') : false;
  const client = await getClientById(params.id);
  if (!client) notFound();

  const [subs, rawTasks, notices, queries, auditLogs] = await Promise.all([
    listClientSubServices(params.id),
    listTasks({ clientId: params.id, limit: 20 }),
    listAllNotices({ clientId: params.id }),
    listQueries({ clientId: params.id }),
    listEntityAuditLogs('client', params.id),
  ]);

  const tasks = await enrichTasksWithProgress(rawTasks);

  const openTasks = tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled');
  const openNotices = notices.filter((n: any) => n.status !== 'resolved' && n.status !== 'closed');
  const openQueries = queries.filter((q: any) => q.status !== 'resolved' && q.status !== 'closed');

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Back link */}
      <Link href="/team/clients" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Back to clients
      </Link>

      {/* Header Card */}
      <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
              <Building2 className="h-7 w-7 text-zinc-400" />
            </div>
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">{client.business_name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {client.pan && <span className="text-[12px] text-zinc-500 font-mono">PAN {client.pan}</span>}
                {client.gstin && <span className="text-[12px] text-zinc-500 font-mono">GSTIN {client.gstin}</span>}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[12px] text-zinc-400">
                {client.city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{client.city}{client.state ? `, ${client.state}` : ''}</span>}
                {client.contact_phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{client.contact_phone}</span>}
                {client.contact_email && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" />{client.contact_email}</span>}
              </div>
            </div>
          </div>
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/clients/${params.id}`}><Pencil className="h-4 w-4 mr-1" /> Edit</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Active Work */}
      <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold text-zinc-700">Active work</h3>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[11px]"><Briefcase className="h-3 w-3 mr-1" />{openTasks.length} tasks</Badge>
            <Badge variant="outline" className="text-[11px]"><AlertTriangle className="h-3 w-3 mr-1" />{openNotices.length} notices</Badge>
            <Badge variant="outline" className="text-[11px]"><MessageSquare className="h-3 w-3 mr-1" />{openQueries.length} queries</Badge>
          </div>
        </div>

        {openTasks.length === 0 && openNotices.length === 0 && openQueries.length === 0 ? (
          <div className="text-sm text-zinc-400 py-6 text-center">No active work items for this client.</div>
        ) : (
          <div className="space-y-2">
            {openTasks.slice(0, 5).map((t: any) => (
              <Link key={t.id} href={`/team/tasks/${t.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-zinc-900 truncate">{t.title}</div>
                  <div className="text-[11px] text-zinc-400">{t.status} · Due {t.due_date ?? '—'}</div>
                </div>
                <ProgressRing size={24} strokeWidth={3} hideLabel progress={t.progress_pct ?? 0} />
                <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-[#0D9488] transition-colors" />
              </Link>
            ))}
            {openNotices.slice(0, 3).map((n: any) => (
              <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-zinc-900 truncate">{n.subject ?? n.notice_type}</div>
                  <div className="text-[11px] text-zinc-400">{n.issuing_authority} · Due {n.due_date ?? '—'}</div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded border ${statusBadgeClass(n.status)}`}>{n.status}</span>
              </div>
            ))}
            {openQueries.slice(0, 3).map((q: any) => (
              <div key={q.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-[#0D9488]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-zinc-900 truncate">{q.subject}</div>
                  <div className="text-[11px] text-zinc-400">Query · {q.status}</div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded border ${statusBadgeClass(q.status)}`}>{q.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 className="text-[13px] font-semibold text-zinc-700 mb-4">Contact</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-zinc-400 text-[11px] uppercase tracking-wider">Person</dt>
              <dd className="text-zinc-900">{client.primary_contact_person || '—'}</dd>
            </div>
            <div>
              <dt className="text-zinc-400 text-[11px] uppercase tracking-wider">Email</dt>
              <dd className="text-zinc-900">{client.primary_contact_email || '—'}</dd>
            </div>
            <div>
              <dt className="text-zinc-400 text-[11px] uppercase tracking-wider">Phone</dt>
              <dd className="text-zinc-900">{client.primary_contact_phone || '—'}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 className="text-[13px] font-semibold text-zinc-700 mb-4">Subscribed services</h3>
          {subs.length === 0 ? (
            <p className="text-sm text-zinc-500">None yet. Ask your admin to assign a service.</p>
          ) : (
            <ul className="space-y-2">
              {subs.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-900">{s.sub_services?.name}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{s.sub_services?.frequency}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* vCFO Quick Link */}
      <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-semibold text-zinc-700">vCFO advisory</h3>
            <p className="text-sm text-zinc-500 mt-1">Cash runway, burn analysis and strategic recommendations.</p>
          </div>
          <Link
            href={`/team/clients/${params.id}/vcfo`}
            className="inline-flex items-center h-9 px-4 rounded-lg bg-teal-800 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <TrendingUp className="h-4 w-4 mr-1.5" /> Open workspace
          </Link>
        </div>
      </div>

      {/* Activity */}
      <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h3 className="text-[13px] font-semibold text-zinc-700 mb-4">Activity log</h3>
        <AuditTimeline entries={auditLogs as any} />
      </div>
    </div>
  );
}
