import Link from 'next/link';
import { listAccessibleClients, listClientGroups } from '@/lib/repositories/clients';
import { listSavedViews } from '@/lib/actions/saved-views';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Upload, Users } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import SavedViewsBar from '@/components/sophistication/saved-views-bar';
import FilterBar from '@/components/sophistication/filter-bar';
import ClientsTableClient from './clients-table-client';
import ExportButton from '@/components/sophistication/export-button';

export const dynamic = 'force-dynamic';

export default async function AdminClientsList({ searchParams }: { searchParams: { group?: string; city?: string; q?: string } }) {
  const [clients, groups, views] = await Promise.all([
    listAccessibleClients({
      groupId: searchParams.group,
      city: searchParams.city,
      q: searchParams.q,
    }),
    listClientGroups(),
    listSavedViews('admin.clients'),
  ]);

  const sb = createClient();
  const clientIds = clients.map((c: any) => c.id);

  // Fetch compliance status for listed clients
  let complianceMap: Record<string, { gst: string; tds: string; it: string }> = {};
  if (clientIds.length > 0) {
    const { data: complianceData } = await sb
      .from('compliance_status')
      .select('client_id, status, service_kind')
      .in('client_id', clientIds)
      .limit(1000);

    for (const row of (complianceData ?? []) as any[]) {
      if (!complianceMap[row.client_id]) {
        complianceMap[row.client_id] = { gst: 'unknown', tds: 'unknown', it: 'unknown' };
      }
      if (row.service_kind === 'gst') complianceMap[row.client_id].gst = row.status;
      if (row.service_kind === 'tds') complianceMap[row.client_id].tds = row.status;
      if (row.service_kind === 'it') complianceMap[row.client_id].it = row.status;
    }
  }

  // Fetch active engagement counts
  let engagementMap: Record<string, number> = {};
  if (clientIds.length > 0) {
    const { data: subServices } = await sb
      .from('client_sub_services')
      .select('client_id')
      .in('client_id', clientIds)
      .eq('is_active', true);

    for (const row of (subServices ?? []) as any[]) {
      engagementMap[row.client_id] = (engagementMap[row.client_id] ?? 0) + 1;
    }
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">Clients</h1>
          <p className="text-sm text-zinc-500 mt-1">Your firm&apos;s client roster.</p>
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

      {clients.length === 0 ? (
        <EmptyState
          title="No clients found"
          body="Try adjusting your filters or onboard your first client."
          actionHref="/admin/clients/new"
          actionLabel="Create client"
          icon={<Building2 className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <ClientsTableClient clients={enrichedClients as any} />
      )}
    </div>
  );
}
