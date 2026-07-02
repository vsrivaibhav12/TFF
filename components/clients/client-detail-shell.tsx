import Link from 'next/link';
import { DockLink } from '@/components/shell/dock-link';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Building2, MapPin, Phone, Mail, FileText, AlertTriangle, MessageSquare, Briefcase, ArrowRight, Pencil } from 'lucide-react';
import AuditTimeline from '@/components/sophistication/audit-timeline';
import { Button } from '@/components/ui/button';
import { displayTaskName } from '@/lib/utils';
import ClientFormWrapper from './client-form-wrapper';
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
  canEdit?: boolean;
  canDelete?: boolean;
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
  canEdit = false,
  canDelete = false,
  isModal,
}: Props) {
  const taskPrefix = basePath.replace('/clients', '/tasks');
  const queryPrefix = basePath.replace('/clients', '/queries');
  return (
    <div className={`flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 ${isModal ? 'h-full' : 'h-[calc(100vh-6.5rem)]'}`}>
      {!isModal && (
        <div className="flex-none mb-4 md:hidden">
          <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 font-medium">
            <ChevronLeft className="h-4 w-4" /> Back to clients
          </Link>
        </div>
      )}

      {isModal ? (
        <div className="flex-1 min-h-0 flex flex-col gap-4 pb-6 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {/* Compact Header */}
          <div className="tff-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-semibold tracking-tight text-zinc-900 truncate">{client.business_name}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {client.pan && <span className="text-[11px] text-zinc-500 font-mono">PAN {client.pan}</span>}
                    {client.gstin && <span className="text-[11px] text-zinc-500 font-mono">GSTIN {client.gstin}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-400">
                    {client.city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{client.city}{client.state ? `, ${client.state}` : ''}</span>}
                    {client.primary_contact_phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{client.primary_contact_phone}</span>}
                  </div>
                </div>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link href={`${basePath}/${client.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Active Work */}
          <div className="tff-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-zinc-700">Active work</h3>
              <div className="flex gap-1.5">
                <Badge variant="outline" className="text-[10px]"><Briefcase className="h-3 w-3 mr-1" />{openTasks.length}</Badge>
                <Badge variant="outline" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />{openNotices.length}</Badge>
                <Badge variant="outline" className="text-[10px]"><MessageSquare className="h-3 w-3 mr-1" />{openQueries.length}</Badge>
              </div>
            </div>

            {openTasks.length === 0 && openNotices.length === 0 && openQueries.length === 0 ? (
              <div className="text-sm text-zinc-400 py-4 text-center">No active work items.</div>
            ) : (
              <div className="space-y-2">
                {openTasks.slice(0, 5).map((t: any) => (
                  <DockLink key={t.id} item={{ type: 'task', id: t.id }} href={`${taskPrefix}/${t.id}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 transition-colors group">
                    <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center flex-shrink-0 border border-zinc-200">
                      <FileText className="h-3.5 w-3.5 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-zinc-900 truncate">{displayTaskName(t)}</div>
                      <div className="text-[10px] text-zinc-400">{t.status} · Due {t.due_date ?? '—'}</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBadgeClass(t.status)}`}>{t.status}</span>
                  </DockLink>
                ))}
                {openNotices.slice(0, 2).map((n: any) => (
                  <div key={n.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-50 transition-colors group">
                    <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center flex-shrink-0 border border-zinc-200">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-zinc-900 truncate">{n.subject ?? n.notice_type}</div>
                      <div className="text-[10px] text-zinc-400">{n.issuing_authority} · Due {n.due_date ?? '—'}</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBadgeClass(n.status)}`}>{n.status}</span>
                  </div>
                ))}
                {openQueries.slice(0, 2).map((q: any) => (
                  <DockLink key={q.id} item={{ type: 'query', id: q.id }} href={`${queryPrefix}/${q.id}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 transition-colors group">
                    <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center flex-shrink-0 border border-zinc-200">
                      <MessageSquare className="h-3.5 w-3.5 text-[#0D9488]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-zinc-900 truncate">{q.subject}</div>
                      <div className="text-[10px] text-zinc-400">Query · {q.status}</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBadgeClass(q.status)}`}>{q.status}</span>
                  </DockLink>
                ))}
              </div>
            )}
          </div>

          {/* Profile — editable in the dock for admins/capable users */}
          {canEdit ? (
            <div className="tff-card p-4">
              <h3 className="text-[13px] font-semibold text-zinc-700 mb-3">Profile</h3>
              <ClientFormWrapper
                groups={groups}
                owners={owners}
                initial={client}
                basePath={basePath}
                readOnly={false}
                canDelete={canDelete}
              />
            </div>
          ) : (
            <div className="tff-card p-4">
              <h3 className="text-[13px] font-semibold text-zinc-700 mb-3">Profile</h3>
              <p className="text-xs text-zinc-500">You do not have permission to edit this client.</p>
            </div>
          )}

          {/* Services (read-only pills) */}
          <div className="tff-card p-4">
            <h3 className="text-[13px] font-semibold text-zinc-700 mb-3">Services & engagements</h3>
            {clientSubServices?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {clientSubServices.map((cs: any) => (
                  <span key={cs.id} className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                    {cs.sub_services?.name ?? cs.services?.name ?? 'Unknown'}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">No services assigned.</p>
            )}
          </div>

          {/* Team (read-only avatars) */}
          <div className="tff-card p-4">
            <h3 className="text-[13px] font-semibold text-zinc-700 mb-3">Team</h3>
            {teamAssignments?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {teamAssignments.map((ta: any) => (
                  <div key={ta.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200">
                    <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold">
                      {ta.users_profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
                    </div>
                    <span className="text-[11px] text-zinc-700">{ta.users_profile?.full_name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">No team assigned.</p>
            )}
          </div>

          {/* Activity log (compact) */}
          <div className="tff-card p-4">
            <h3 className="text-[13px] font-semibold text-zinc-700 mb-3">Activity log</h3>
            <AuditTimeline entries={auditLogs as any} />
          </div>

        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-6">
          
          {/* LEFT/CENTER COLUMN: Main Workspace */}
          <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
            
            {/* Header Card */}
            <div className="tff-card p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
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
                    <DockLink key={t.id} item={{ type: 'task', id: t.id }} href={`${taskPrefix}/${t.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-zinc-200">
                        <FileText className="h-4 w-4 text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-zinc-900 truncate">{displayTaskName(t)}</div>
                        <div className="text-[11px] text-zinc-400">{t.status} · Due {t.due_date ?? '—'}</div>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${statusBadgeClass(t.status)}`}>{t.status}</span>
                      <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-[#0D9488] transition-colors" />
                    </DockLink>
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
                    <DockLink key={q.id} item={{ type: 'query', id: q.id }} href={`${queryPrefix}/${q.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-zinc-200">
                        <MessageSquare className="h-4 w-4 text-[#0D9488]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-zinc-900 truncate">{q.subject}</div>
                        <div className="text-[11px] text-zinc-400">Query · {q.status}</div>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${statusBadgeClass(q.status)}`}>{q.status}</span>
                      <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-[#0D9488] transition-colors" />
                    </DockLink>
                  ))}
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="tff-card p-6">
              <h3 className="text-[13px] font-semibold text-zinc-700 mb-4">Profile</h3>
              <ClientFormWrapper groups={groups} owners={owners} initial={client} basePath={basePath} readOnly={!canEdit} canDelete={canDelete} />
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
      )}
    </div>
  );
}
