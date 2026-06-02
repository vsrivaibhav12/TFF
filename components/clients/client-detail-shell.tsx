import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Building2, MapPin, Phone, Mail, FileText, AlertTriangle, MessageSquare, Briefcase, ArrowRight } from 'lucide-react';
import AuditTimeline from '@/components/sophistication/audit-timeline';
import ClientForm from '@/app/admin/clients/client-form';
import ClientServiceManager from '@/app/admin/clients/[id]/service-manager';
import ClientTeamManager from '@/app/admin/clients/[id]/team-manager';

interface Props {
  client: any;
  groups: any;
  owners: any;
  clientServices: any;
  clientSubServices: any;
  clientUsers: any;
  teamAssignments: any;
  auditLogs: any;
  openTasks: any;
  openNotices: any;
  openQueries: any;
  basePath: string;
  isModal?: boolean;
}

function statusBadgeClass(status: string) {
  if (['completed','filed','resolved','closed'].includes(status)) return 'bg-teal-50 text-teal-700 border-teal-200';
  if (['in_progress','processing','open','pending'].includes(status)) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (['overdue','urgent','stuck','blocked'].includes(status)) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-zinc-50 text-zinc-600 border-zinc-200';
}

export default function ClientDetailShell({
  client,
  groups,
  owners,
  clientServices,
  clientSubServices,
  clientUsers,
  teamAssignments,
  auditLogs,
  openTasks,
  openNotices,
  openQueries,
  basePath,
  isModal,
}: Props) {
  return (
    <div className={`flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 ${isModal ? 'h-full' : 'h-[calc(100vh-6.5rem)]'}`}>
      {!isModal && (
        <div className="flex-none mb-4">
          <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 font-medium">
            <ChevronLeft className="h-4 w-4" /> Back to clients
          </Link>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-6">
        
        {/* LEFT/CENTER COLUMN: Main Workspace */}
        <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
          
          {/* Header Card */}
          <div className="tff-card p-6">
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
                  {client.primary_contact_phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{client.primary_contact_phone}</span>}
                  {client.primary_contact_email && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" />{client.primary_contact_email}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Active Work */}
          <div className="tff-card p-6">
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
                  <Link key={t.id} href={`/admin/tasks/${t.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-zinc-200">
                      <FileText className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-zinc-900 truncate">{t.title}</div>
                      <div className="text-[11px] text-zinc-400">{t.status} · Due {t.due_date ?? '—'}</div>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded border ${statusBadgeClass(t.status)}`}>{t.status}</span>
                    <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-[#0D9488] transition-colors" />
                  </Link>
                ))}
                {openNotices.slice(0, 3).map((n: any) => (
                  <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-zinc-200">
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
                  <Link key={q.id} href={`/admin/queries/${q.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-zinc-200">
                      <MessageSquare className="h-4 w-4 text-[#0D9488]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-zinc-900 truncate">{q.subject}</div>
                      <div className="text-[11px] text-zinc-400">Query · {q.status}</div>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded border ${statusBadgeClass(q.status)}`}>{q.status}</span>
                    <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-[#0D9488] transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="tff-card p-6">
            <h3 className="text-[13px] font-semibold text-zinc-700 mb-4">Profile</h3>
            <ClientForm groups={groups} owners={owners} initial={client} />
          </div>

        </div>

        {/* RIGHT COLUMN: Metadata & Management */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pl-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
          
          {/* Services */}
          <div className="tff-card p-6">
            <h3 className="text-[13px] font-semibold text-zinc-700 mb-4">Services & engagements</h3>
            <ClientServiceManager
              clientId={client.id}
              existingSubServices={clientSubServices as any}
              existingServices={clientServices as any}
              teamUsers={owners as any}
            />
          </div>

          {/* Team */}
          <div className="tff-card p-6">
            <h3 className="text-[13px] font-semibold text-zinc-700 mb-4">Team</h3>
            <ClientTeamManager
              clientId={client.id}
              assignments={teamAssignments as any}
              availableTeam={owners}
              clientUsers={clientUsers as any}
            />
          </div>

          {/* Activity */}
          <div className="tff-card p-6">
            <h3 className="text-[13px] font-semibold text-zinc-700 mb-4">Activity log</h3>
            <AuditTimeline entries={auditLogs as any} />
          </div>

        </div>
      </div>
    </div>
  );
}
