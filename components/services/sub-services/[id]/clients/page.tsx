import { notFound } from 'next/navigation';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import Link from 'next/link';
import { DockLink } from '@/components/shell/dock-link';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { createClient } from '@/lib/supabase/server';
import { listClientsBySubService } from '@/lib/repositories/services';
import { listTeamUsers, listAccessibleClients } from '@/lib/repositories/clients';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Building2, Users, Briefcase } from 'lucide-react';

import LinkClientForm from './link-client-form';

export const dynamic = 'force-dynamic';

export default async function SubServiceClientsPage({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'services.manage');
  const taskWizardHref = `/${me.role}/tasks/bulk-create?sub_service_id=${id}`;

  const sb = createClient();
  const { data: subService } = await sb
    .from('sub_services')
    .select('id, name, code, frequency, service_id, services!inner(name, code)')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!subService) notFound();
  const serviceName = (subService as any).services?.name ?? (subService as any).services?.[0]?.name ?? 'Service';

  const [links, team, allClients] = await Promise.all([
    listClientsBySubService(id),
    listTeamUsers(),
    listAccessibleClients({ limit: 5000 }),
  ]);

  const activeLinks = links.filter((l: any) => l.is_active !== false);

  return (
    <div className="space-y-8">
      <Link href={`/${me.role}/services`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Services catalogue
      </Link>

      <PageHeader
        title={subService.name}
        subtitle={`${serviceName} › ${subService.code} · ${subService.frequency} · ${activeLinks.length} client${activeLinks.length !== 1 ? 's' : ''} linked`}
        actions={
          <>
            <Badge variant="outline" className="text-xs">{subService.frequency}</Badge>
            <LinkClientForm subServiceId={subService.id} allClients={allClients as any} linkedClientIds={activeLinks.map((l: any) => l.clients?.id).filter(Boolean)} />
          </>
        }
      />

      {activeLinks.length === 0 ? (
        <div className="tff-card p-8 text-center">
          <Users className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
          <h3 className="font-semibold text-zinc-900">No clients linked yet</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
            Link clients to this sub-service using the button above, or from the client's profile page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="tff-card overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Linked clients</h3>
                <span className="text-xs text-zinc-500">{activeLinks.length} total</span>
              </div>
              <div className="divide-y divide-zinc-100">
                {activeLinks.map((link: any) => {
                  const client = link.clients;
                  return (
                    <div key={link.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div>
                          <DockLink item={{ type: 'client', id: client.id }} href={`/admin/clients/${client.id}`} className="text-sm font-medium text-zinc-900 hover:text-teal-700">
                            {client.business_name}
                          </DockLink>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            {client.pan && <span className="font-mono mr-2">PAN {client.pan}</span>}
                            {client.gstin && <span className="font-mono mr-2">GSTIN {client.gstin}</span>}
                            {client.city && <span>{client.city}</span>}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Active</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="tff-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-teal-600" />
                <h3 className="font-semibold text-sm">Bulk create tasks</h3>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Use the new 4-step Task Wizard to easily create tasks for all these linked clients in one go, complete with assignee mapping and template selection.
              </p>
              <Link href={taskWizardHref} className="w-full flex">
                <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                  Launch Task Wizard
                </Button>
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
