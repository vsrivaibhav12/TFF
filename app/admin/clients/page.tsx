import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect, hasCapability } from '@/lib/auth/require-capability';
import Link from 'next/link';
import { listAccessibleClients, listClientGroups, countAccessibleClients } from '@/lib/repositories/clients';
import { getComplianceStatusForClients } from '@/lib/repositories/compliance';
import { countActiveEngagementsForClients } from '@/lib/repositories/client-sub-services';
import { listSavedViews } from '@/lib/actions/saved-views';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Upload, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import SavedViewsBar from '@/components/sophistication/saved-views-bar';
import FilterBar from '@/components/sophistication/filter-bar';
import ClientsTableClient from './clients-table-client';
import ExportButton from '@/components/sophistication/export-button';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function AdminClientsList({ searchParams }: { searchParams: { group?: string; city?: string; q?: string; page?: string } }) {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'clients.read.all');
  const canAssignServices = await hasCapability(me, 'services.assign');
  const currentPage = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const filterOpts = {
    groupId: searchParams.group,
    city: searchParams.city,
    q: searchParams.q,
  };

  const [clients, groups, views, totalCount] = await Promise.all([
    listAccessibleClients({
      ...filterOpts,
      limit: PAGE_SIZE,
      offset,
    }),
    listClientGroups(),
    listSavedViews('admin.clients'),
    countAccessibleClients(filterOpts),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const clientIds = clients.map((c: any) => c.id);

  const [complianceMap, engagementMap] = await Promise.all([
    clientIds.length > 0 ? getComplianceStatusForClients(clientIds) : Promise.resolve<Record<string, { gst: string; tds: string; it: string }>>({}),
    clientIds.length > 0 ? countActiveEngagementsForClients(clientIds) : Promise.resolve<Record<string, number>>({}),
  ]);

  const exportData = clients.map((c: any) => ({
    business_name: c.business_name,
    gstin: c.gstin ?? '',
    category: c.category ?? '',
    city: c.city ?? '',
    state: c.state ?? '',
    portal_enabled: c.portal_enabled,
  }));

  const enrichedClients = clients.map((c: any) => ({
    ...c,
    group_name: c.client_groups?.name ?? null,
    compliance: complianceMap[c.id] ?? { gst: 'unknown', tds: 'unknown', it: 'unknown' },
    engagements: engagementMap[c.id] ?? 0,
  }));

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">Clients</h1>
          <p className="text-sm text-zinc-500 mt-1">{totalCount} client{totalCount !== 1 ? 's' : ''} in your firm&apos;s roster.</p>
        </div>
        <div className="flex gap-2">
          <ExportButton data={exportData} filename="clients" format="excel" />
          <Button variant="outline" asChild>
            <Link href="/admin/clients/groups"><Users className="h-4 w-4 mr-1" /> Groups</Link>
          </Button>
          <Button variant="outline" asChild data-testid="bulk-import-btn">
            <Link href="/admin/clients/import"><Upload className="h-4 w-4 mr-1" /> Bulk import</Link>
          </Button>
          <Button asChild data-testid="new-client-btn">
            <Link href="/admin/clients/new"><Plus className="h-4 w-4 mr-1" /> New client</Link>
          </Button>
        </div>
      </div>

      <FilterBar
        selects={[
          { key: 'group', placeholder: 'All groups', options: groups.map((g: any) => ({ value: g.id, label: g.name })) },
        ]}
        inputs={[
          { key: 'city', placeholder: 'City', type: 'text' },
          { key: 'q', placeholder: 'Search name / PAN', type: 'text' },
        ]}
      />

      <SavedViewsBar scope="admin.clients" views={views as any} />

      {clients.length === 0 && currentPage === 1 ? (
        <EmptyState
          title="No clients found"
          body="Try adjusting your filters or onboard your first client."
          actionHref="/admin/clients/new"
          actionLabel="Create client"
          icon={<Building2 className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <>
          <ClientsTableClient clients={enrichedClients as any} showBulkAssign={canAssignServices} />

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
