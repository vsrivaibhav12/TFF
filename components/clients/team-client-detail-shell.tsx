import Link from 'next/link';
import { displayTaskName } from '@/lib/utils';
import { DockLink } from '@/components/shell/dock-link';
import { Badge } from '@/components/ui/badge';
import { ProgressRing } from '@/components/ui/progress-ring';
import { ChevronLeft, Building2, MapPin, Phone, Mail, FileText, Briefcase, ArrowRight, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuditTimeline from '@/components/sophistication/audit-timeline';

interface Props {
  client: any;
  subs: any;
  auditLogs: any;
  openTasks: any;
  canEdit?: boolean;
  basePath: string;
  isModal?: boolean;
}

function statusBadgeClass(status: string) {
  if (['completed','filed','resolved','closed'].includes(status)) return 'bg-teal-50 text-teal-700 border-teal-200';
  if (['in_progress','processing','open','pending'].includes(status)) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (['overdue','urgent','stuck','blocked'].includes(status)) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

export default function TeamClientDetailShell({
  client,
  subs,
  auditLogs,
  openTasks,
  canEdit = false,
  basePath,
  isModal,
}: Props) {
  return (
    <div className={`flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 ${isModal ? 'h-full' : 'h-[calc(100vh-6.5rem)]'}`}>
      {!isModal && (
        <div className="flex-none mb-4 md:hidden">
          <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 font-medium">
            <ChevronLeft className="h-4 w-4" /> Back to clients
          </Link>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-6">
        
        {/* LEFT/CENTER COLUMN: Main Workspace */}
        <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
          
          {/* Header Card */}
          <div className="tff-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-7 w-7 text-slate-500" />
                </div>
                <div>
                  <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">{client.business_name}</h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {client.pan && <span className="text-[12px] text-slate-500 font-mono">PAN {client.pan}</span>}
                    {client.gstin && <span className="text-[12px] text-slate-500 font-mono">GSTIN {client.gstin}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[12px] text-slate-500">
                    {client.city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{client.city}{client.state ? `, ${client.state}` : ''}</span>}
                    {client.primary_contact_phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{client.primary_contact_phone}</span>}
                    {client.primary_contact_email && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" />{client.primary_contact_email}</span>}
                  </div>
                </div>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/team/clients/${client.id}/edit`}><Pencil className="h-4 w-4 mr-1" /> Edit</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Active Work */}
          <div className="tff-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-semibold text-slate-700">Active work</h3>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs"><Briefcase className="h-3 w-3 mr-1" />{openTasks.length} tasks</Badge>
              </div>
            </div>

            {openTasks.length === 0 ? (
              <div className="text-sm text-slate-500 py-6 text-center">No active work items for this client.</div>
            ) : (
              <div className="space-y-2">
                {openTasks.slice(0, 5).map((t: any) => (
                  <DockLink key={t.id} item={{ type: 'task', id: t.id }} href={`/team/tasks/${t.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-slate-200">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-slate-900 truncate">{displayTaskName(t)}</div>
                      <div className="text-xs text-slate-500">{t.status} · Due {t.due_date ?? '—'}</div>
                    </div>
                    <ProgressRing size={24} strokeWidth={3} hideLabel progress={t.progress_pct ?? 0} />
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#0D9488] transition-colors" />
                  </DockLink>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Metadata & Management */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pl-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
          
          <div className="tff-card p-6">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Contact</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500 text-xs">Person</dt>
                <dd className="text-slate-900">{client.primary_contact_person || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Email</dt>
                <dd className="text-slate-900">{client.primary_contact_email || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Phone</dt>
                <dd className="text-slate-900">{client.primary_contact_phone || '—'}</dd>
              </div>
            </dl>
          </div>
          
          <div className="tff-card p-6">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Subscribed services</h3>
            {subs.length === 0 ? (
              <p className="text-sm text-slate-500">None yet. Ask your admin to assign a service.</p>
            ) : (
              <ul className="space-y-2">
                {subs.map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-900">{s.sub_services?.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{s.sub_services?.frequency}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Activity */}
          <div className="tff-card p-6">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Activity log</h3>
            <AuditTimeline entries={auditLogs as any} />
          </div>

        </div>
      </div>
    </div>
  );
}
