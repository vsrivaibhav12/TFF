import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { hasCapabilities } from '@/lib/auth/capabilities-cache';
import Link from 'next/link';
import NewClientDialog from '@/components/clients/new-client-dialog';
import { listAccessibleClients, listClientGroups, countAccessibleClients } from '@/lib/repositories/clients';
import { getClientComplianceSummary } from '@/lib/repositories/compliance-tasks';
import { todayIST } from '@/lib/utils';
import { countActiveEngagementsForClients } from '@/lib/repositories/client-sub-services';
import { Button } from '@/components/ui/button';
import { Upload, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import FilterBar from '@/components/sophistication/filter-bar';
import ClientsTableClient from '@/components/clients/clients-table-client';
import { FullExport } from '@/components/reports/full-export';


const PAGE_SIZE = 50;

export default async function AdminClientsList({ searchParams }: { searchParams: { group?: string; city?: string; q?: string; page?: string } }) {
  const me = await requireRole('admin');
  await requireCapabilityOrRedirect(me, 'clients.read.all');

  const currentPage = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const filterOpts = {
    groupId: searchParams.group,
    city: searchParams.city,
    q: searchParams.q,
  };

  const caps = await hasCapabilities(me, ['services.assign', 'clients.delete']);
  const canAssignServices = me.role === 'admin' || caps.has('services.assign');
  const canDelete = me.role === 'admin' || caps.has('clients.delete');

  const [clients, groups, totalCount] = await Promise.all([
    listAccessibleClients({
      ...filterOpts,
      limit: PAGE_SIZE,
      offset,
    }),
    listClientGroups(),
    countAccessibleClients(filterOpts),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const clientIds = clients.map((c: any) => c.id);

  const [complianceMap, engagementMap] = await Promise.all([
    getClientComplianceSummary(clientIds, todayIST()),
    clientIds.length > 0 ? countActiveEngagementsForClients(clientIds) : Promise.resolve<Record<string, number>>({}),
  ]);


  const enrichedClients = clients.map((c: any) => {
    const compliance = complianceMap[c.id] ?? { open: 0, overdue: 0 };
    return {
      ...c,
      group_name: c.client_groups?.name ?? null,
      compliance,
      engagements: engagementMap[c.id] ?? 0,
    };
  });

  // Build pagination query string
  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (searchParams.group) params.set('group', searchParams.group);
    if (searchParams.city) params.set('city', searchParams.city);
    if (searchParams.q) params.set('q', searchParams.q);
    params.set('page', String(page));
    return `/admin/clients?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">Clients</h1>
          <p className="text-sm text-zinc-500 mt-1">{totalCount.toLocaleString('en-IN')} client{totalCount !== 1 ? 's' : ''} in your firm&apos;s roster.</p>
        </div>
        <div className="flex gap-2">
          <FullExport source={{ kind: 'clients', filters: { group: searchParams.group, city: searchParams.city, q: searchParams.q } }} label="clients" filename="clients" total={totalCount} />
          <Button variant="outline" asChild>
            <Link href="/admin/clients/groups"><Users className="h-4 w-4 mr-1" /> Groups</Link>
          </Button>
          <Button variant="outline" asChild data-testid="bulk-import-btn">
            <Link href="/admin/clients/import"><Upload className="h-4 w-4 mr-1" /> Bulk import</Link>
          </Button>
          <NewClientDialog groups={groups} />
        </div>
      </div>

      <FilterBar
        selects={[
          { key: 'group', placeholder: 'All groups', options: groups.map((g: any) => ({ value: g.id, label: g.name })) },
        ]}
        inputs={[
          { key: 'city', placeholder: 'City', type: 'text' },
        ]}
      />

      {clients.length === 0 && currentPage === 1 ? (
        <EmptyState
          title="No clients found"
          body="Try adjusting your filters or onboard your first client."
          actionLabel="Create client"
          variant="clients"
        />
      ) : (
        <>
          <ClientsTableClient base="/admin" clients={enrichedClients as any} showBulkAssign={canAssignServices} canDelete={canDelete} />

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-zinc-500">
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-1">
                {currentPage > 1 ? (
                  <Link
                    href={pageHref(currentPage - 1)}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-100 text-zinc-300">
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                )}
                <span className="px-3 text-sm font-medium text-zinc-700">
                  Page {currentPage} of {totalPages}
                </span>
                {currentPage < totalPages ? (
                  <Link
                    href={pageHref(currentPage + 1)}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-100 text-zinc-300">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
