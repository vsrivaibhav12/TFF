import { listAccessibleClients, listClientGroups, countAccessibleClients } from '@/lib/repositories/clients';
import { getComplianceStatusForClients } from '@/lib/repositories/compliance';
import { countActiveEngagementsForClients } from '@/lib/repositories/client-sub-services';
import { listSavedViews } from '@/lib/actions/saved-views';
import { requireRole } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import Link from 'next/link';
import NewClientDialog from '@/components/clients/new-client-dialog';
import { Users, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExportButton from '@/components/sophistication/export-button';
import EmptyState from '@/components/sophistication/empty-state';
import SavedViewsBar from '@/components/sophistication/saved-views-bar';
import FilterBar from '@/components/sophistication/filter-bar';
import ClientsTableClient from './clients-table-client';
import { PullToRefreshWrapper } from '@/components/ui/pull-to-refresh-wrapper';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function TeamClientsList({ searchParams }: { searchParams: { group?: string; city?: string; q?: string; page?: string } }) {
  const me = await requireRole(['admin', 'team']);
  const canCreate = await hasCapability(me, 'clients.create');
  const canAssignServices = await hasCapability(me, 'services.assign');
  const canDelete = await hasCapability(me, 'clients.delete');
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
    listSavedViews('team.clients'),
    countAccessibleClients(filterOpts),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const clientIds = clients.map((c) => c.id);

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

  const enrichedClients = clients.map((c) => {
    const compliance = complianceMap[c.id] ?? { gst: 'unknown', tds: 'unknown', it: 'unknown' };
    const filedCount = [compliance.gst, compliance.tds, compliance.it].filter((s) => s === 'filed' || s === 'completed').length;
    const inProgressCount = [compliance.gst, compliance.tds, compliance.it].filter((s) => s === 'in_progress' || s === 'processing').length;
    const score = filedCount * 1 + inProgressCount * 0.5 + (3 - filedCount - inProgressCount) * (['unknown', 'pending'].includes(compliance.gst) ? 0.5 : 0);
    const health = Math.min(100, Math.round((score / 3) * 100));
    return {
      ...c,
      group_name: c.client_groups?.name ?? null,
      compliance,
      engagements: engagementMap[c.id] ?? 0,
      complianceHealth: health,
    };
  });

  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (searchParams.group) params.set('group', searchParams.group);
    if (searchParams.city) params.set('city', searchParams.city);
    if (searchParams.q) params.set('q', searchParams.q);
    params.set('page', String(page));
    return `/team/clients?${params.toString()}`;
  }

  return (
    <PullToRefreshWrapper>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">My clients</h1>
          <p className="text-sm text-zinc-500 mt-1">{totalCount} client{totalCount !== 1 ? 's' : ''} assigned to you</p>
        </div>
        <div className="flex gap-2">
          <ExportButton data={exportData} filename="clients" format="excel" />
          {canCreate && (
            <Button asChild>
              <NewClientDialog groups={groups} />
            </Button>
          )}
        </div>
      </div>

      <FilterBar
        selects={[
          { key: 'group', placeholder: 'All groups', options: groups.map((g) => ({ value: g.id, label: g.name })) },
        ]}
        inputs={[
          { key: 'city', placeholder: 'City', type: 'text' },
          { key: 'q', placeholder: 'Search name / PAN', type: 'text' },
        ]}
      />

      <SavedViewsBar scope="team.clients" views={views ?? []} />

      {clients.length === 0 && currentPage === 1 ? (
        <EmptyState
          title="No clients found"
          body="Try adjusting your filters or ask an admin to assign you to a client."
          icon={<Users className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <>
          <ClientsTableClient clients={enrichedClients} groups={groups} canDelete={canDelete} />

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
    </PullToRefreshWrapper>
  );
}
