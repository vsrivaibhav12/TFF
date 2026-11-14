import Link from 'next/link';
import { DockLink } from '@/components/shell/dock-link';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Building2, MapPin, Phone, Mail, FileText, Briefcase, ArrowRight } from 'lucide-react';
import AuditTimeline from '@/components/sophistication/audit-timeline';
import { displayTaskName, formatDateIST } from '@/lib/utils';
import ClientFormWrapper from './client-form-wrapper';
import ClientProfileSection from './client-profile-section';
import ClientServiceManager from '@/app/admin/clients/[id]/service-manager';
import ClientTeamManager from '@/app/admin/clients/[id]/team-manager';

interface Client {
  id: string;
  business_name: string;
  pan?: string | null;
  gstin?: string | null;
  city?: string | null;
  state?: string | null;
  primary_contact_phone?: string | null;
  primary_contact_email?: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface Owner {
  id: string;
  full_name: string;
  email: string;
}

interface ClientService {
  id: string;
  services?: { name?: string | null; code?: string | null } | null;
  start_date?: string | null;
  service_head_id?: string | null;
}

interface ClientSubService {
  id: string;
  sub_services?: { name?: string | null; services?: { name?: string | null } | null } | null;
  services?: { name?: string | null } | null;
}

interface TeamAssignment {
  id: string;
  users_profile?: { full_name?: string | null } | null;
}

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
}

interface OpenTask {
  id: string;
  status: string;
  due_date?: string | null;
  title?: string | null;
  sub_services?: { name?: string | null } | null;
}

interface Props {
  client: Client;
  groups: Group[];
  owners: Owner[];
  clientServices: ClientService[];
  clientSubServices: ClientSubService[];
  teamAssignments: TeamAssignment[];
  auditLogs: AuditLog[];
  openTasks: OpenTask[];
  basePath: string;
  canEdit?: boolean;
  canDelete?: boolean;
  isModal?: boolean;
}

function statusText(status: string) {
  const t = status.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function statusBadgeClass(status: string) {
  if (['completed','filed','resolved','closed'].includes(status)) return 'bg-teal-50 text-teal-700 border-teal-200';
  if (['in_progress','processing','open','pending'].includes(status)) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (['overdue','urgent','stuck','blocked'].includes(status)) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

export default function ClientDetailShell({
  client,
  groups,
  owners,
  clientServices,
  clientSubServices,
  teamAssignments,
  auditLogs,
  openTasks,
  basePath,
  canEdit = false,
  canDelete = false,
  isModal,
}: Props) {
  const taskPrefix = basePath.replace('/clients', '/tasks');
  return (
    <div className={`flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 ${isModal ? 'h-full' : 'h-[calc(100vh-6.5rem)]'}`}>
      {!isModal && (
        <div className="flex-none mb-4 md:hidden">
          <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 font-medium">
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
                <div className="min-w-0">
                  <h1 className="text-base font-semibold tracking-tight text-slate-900 truncate">{client.business_name}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {client.pan && <span className="text-xs text-slate-500 font-mono">PAN {client.pan}</span>}
                    {client.gstin && <span className="text-xs text-slate-500 font-mono">GSTIN {client.gstin}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                    {client.city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{client.city}{client.state ? `, ${client.state}` : ''}</span>}
                    {client.primary_contact_phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{client.primary_contact_phone}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Work */}
          <div className="tff-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="tff-section-title">Active work</h3>
              <div className="flex gap-1.5">
                <Badge variant="outline" className="text-xs"><Briefcase className="h-3 w-3 mr-1" />{openTasks.length}</Badge>
              </div>
            </div>

            {openTasks.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">No active work items.</div>
            ) : (
              <div className="space-y-2">
                {openTasks.slice(0, 5).map((t) => (
                  <DockLink key={t.id} item={{ type: 'task', id: t.id }} href={`${taskPrefix}/${t.id}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
                    <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center flex-shrink-0 border border-slate-200">
                      <FileText className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-slate-900 truncate">{displayTaskName(t as { sub_services?: { name?: string } | null; title?: string | null })}</div>
                      <div className="text-xs text-slate-500">{statusText(t.status)} · Due {formatDateIST(t.due_date)}</div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${statusBadgeClass(t.status)}`}>{statusText(t.status)}</span>
                  </DockLink>
                ))}
              </div>
            )}
          </div>

          {/* Profile: read-only summary, with an Edit button for people who may edit */}
          <ClientProfileSection
            client={client}
            groups={groups}
            owners={owners}
            basePath={basePath}
            canEdit={canEdit}
            canDelete={canDelete}
          />

          {/* Services (read-only pills) */}
          <div className="tff-card p-4">
            <h3 className="tff-section-title mb-3">Services & engagements</h3>
            {clientSubServices?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {clientSubServices.map((cs) => (
                  <span key={cs.id} className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {cs.sub_services?.name ?? cs.services?.name ?? 'Unknown'}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No services assigned.</p>
            )}
          </div>

          {/* Team (read-only avatars) */}
          <div className="tff-card p-4">
            <h3 className="tff-section-title mb-3">Team</h3>
            {teamAssignments?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {teamAssignments.map((ta) => (
                  <div key={ta.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-medium">
                      {ta.users_profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
                    </div>
                    <span className="text-xs text-slate-700">{ta.users_profile?.full_name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No team assigned.</p>
            )}
          </div>

          {/* Activity log (compact) */}
          <div className="tff-card p-4">
            <h3 className="tff-section-title mb-3">Activity log</h3>
            <AuditTimeline entries={auditLogs as unknown as import('@/components/sophistication/audit-timeline').AuditEntry[]} />
          </div>

        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-6">
          
          {/* LEFT/CENTER COLUMN: Main Workspace */}
          <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
            
            {/* Header Card */}
            <div className="tff-card p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-7 w-7 text-slate-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">{client.business_name}</h1>
                  </div>
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
            </div>

            {/* Active Work */}
            <div className="tff-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="tff-section-title">Active work</h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs"><Briefcase className="h-3 w-3 mr-1" />{openTasks.length} tasks</Badge>
                </div>
              </div>

              {openTasks.length === 0 ? (
                <div className="text-sm text-slate-500 py-6 text-center">No active work items for this client.</div>
              ) : (
                <div className="space-y-2">
                  {openTasks.slice(0, 5).map((t) => (
                    <DockLink key={t.id} item={{ type: 'task', id: t.id }} href={`${taskPrefix}/${t.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-slate-200">
                        <FileText className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-slate-900 truncate">{displayTaskName(t as { sub_services?: { name?: string } | null; title?: string | null })}</div>
                        <div className="text-xs text-slate-500">{statusText(t.status)} · Due {formatDateIST(t.due_date)}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded border ${statusBadgeClass(t.status)}`}>{statusText(t.status)}</span>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#0D9488] transition-colors" />
                    </DockLink>
                  ))}
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="tff-card p-6">
              <h3 className="tff-section-title mb-4">Profile</h3>
              <ClientFormWrapper groups={groups} owners={owners} initial={client} basePath={basePath} readOnly={!canEdit} canDelete={canDelete} />
            </div>

          </div>

          {/* RIGHT COLUMN: Metadata & Management */}
          <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pl-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
            
            {/* Services */}
            <div className="tff-card p-6">
              <h3 className="tff-section-title mb-4">Services & engagements</h3>
              <ClientServiceManager
                clientId={client.id}
                existingSubServices={clientSubServices as ClientSubService[]}
                existingServices={clientServices as ClientService[]}
                teamUsers={owners as { id: string; full_name: string; email: string }[]}
              />
            </div>

            {/* Team */}
            <div className="tff-card p-6">
              <h3 className="tff-section-title mb-4">Team</h3>
              <ClientTeamManager
                clientId={client.id}
                assignments={teamAssignments as TeamAssignment[]}
                availableTeam={owners as { id: string; full_name: string; email: string }[]}
              />
            </div>

            {/* Activity */}
            <div className="tff-card p-6">
              <h3 className="tff-section-title mb-4">Activity log</h3>
              <AuditTimeline entries={auditLogs as unknown as import('@/components/sophistication/audit-timeline').AuditEntry[]} />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
