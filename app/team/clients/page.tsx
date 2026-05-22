import { listAccessibleClients, listClientGroups } from '@/lib/repositories/clients';
import { listSavedViews } from '@/lib/actions/saved-views';
import Link from 'next/link';
import { Users, Building2, ArrowRight } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import SavedViewsBar from '@/components/sophistication/saved-views-bar';
import FilterBar from '@/components/sophistication/filter-bar';
import { createClient } from '@/lib/supabase/server';
import ClientsTableClient from './clients-table-client';

export const dynamic = 'force-dynamic';

export default async function TeamClientsList({ searchParams }: { searchParams: { group?: string; city?: string; q?: string } }) {
  const [clients, groups, views] = await Promise.all([
    listAccessibleClients({
      groupId: searchParams.group, city: searchParams.city, q: searchParams.q,
    }),
    listClientGroups(),
    listSavedViews('team.clients'),
  ]);

  const sb = createClient();
  const clientIds = clients.map((c: any) => c.id);

  let complianceMap: Record<string, { gst: string; tds: string; it: string }> = {};
  if (clientIds.length > 0) {
    const { data: complianceData } = await sb
      .from('compliance_status')
      .select('client_id, status, service_kind')
      .in('client_id', clientIds).limit(1000);
    for (const row of (complianceData ?? []) as any[]) {
      if (!complianceMap[row.client_id]) complianceMap[row.client_id] = { gst: 'unknown', tds: 'unknown', it: 'unknown' };
      if (row.service_kind === 'gst') complianceMap[row.client_id].gst = row.status;
      if (row.service_kind === 'tds') complianceMap[row.client_id].tds = row.status;
      if (row.service_kind === 'it') complianceMap[row.client_id].it = row.status;
    }
  }

  let engagementMap: Record<string, number> = {};
  if (clientIds.length > 0) {
    const { data: subServices } = await sb
      .from('client_sub_services').select('client_id')
      .in('client_id', clientIds).eq('is_active', true);
    for (const row of (subServices ?? []) as any[]) {
      engagementMap[row.client_id] = (engagementMap[row.client_id] ?? 0) + 1;
    }
  }

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
          <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">My clients</h1>
          <p className="text-sm text-zinc-500 mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''} assigned to you</p>
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

      <SavedViewsBar scope="team.clients" views={views as any} />

      {clients.length === 0 ? (
        <EmptyState
          title="No clients found"
          body="Try adjusting your filters or ask an admin to assign you to a client."
          icon={<Users className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <ClientsTableClient clients={enrichedClients as any} />
      )}
    </div>
  );
}
