import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listHearings } from '@/lib/repositories/notices';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import { Badge } from '@/components/ui/badge';
import { ScrollText } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import HearingDialog from '@/components/hearings/hearing-dialog';
import FilterBar from '@/components/sophistication/filter-bar';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import HearingsTable from './hearings-table';

export const dynamic = 'force-dynamic';

function buildHearingUrl(sp: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...overrides })) {
    if (v !== undefined && v !== '' && v !== '__none__') params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/team/hearings?${qs}` : '/team/hearings';
}

export default async function HearingsPage({ searchParams }: { searchParams: { status?: string; type?: string; client?: string; date_from?: string; date_to?: string } }) {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'hearings.view');
  const [items, clients] = await Promise.all([
    listHearings({
      status: searchParams.status,
      hearingType: searchParams.type,
      clientId: searchParams.client,
      dateFrom: searchParams.date_from,
      dateTo: searchParams.date_to,
    }),
    listAccessibleClients(),
  ]);

  const statuses = [
    { value: '', label: 'All' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'held', label: 'Held' },
    { value: 'adjourned', label: 'Adjourned' },
    { value: 'concluded', label: 'Concluded' },
  ];

  const exportData = (items ?? []).map((h: any) => ({
    client: h.clients?.business_name ?? '',
    type: h.hearing_type ?? '',
    subject: h.subject ?? '',
    scheduled_date: h.hearing_scheduled_date ?? '',
    officer: h.officer_name ?? '',
    status: h.status,
    venue: h.venue ?? '',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hearings"
        subtitle="Cross-client hearings calendar."
        actions={
          <>
            <ExportButton data={exportData} filename="hearings-export" format="csv" />
            <HearingDialog clients={clients as any} triggerLabel="Schedule hearing" />
          </>
        }
      />

      <div className="space-y-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {statuses.map((f) => (
            <Link
              key={f.value}
              href={buildHearingUrl(searchParams, { status: f.value || undefined })}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs',
                (searchParams.status ?? '') === f.value
                  ? 'border-teal-500 bg-teal-50 text-teal-800'
                  : 'border-zinc-200 hover:bg-zinc-50'
              )}
            >{f.label}</Link>
          ))}
        </div>
        <FilterBar
          selects={[
            { key: 'type', placeholder: 'All types', options: [{ value: 'GST', label: 'GST' }, { value: 'Income Tax', label: 'Income Tax' }, { value: 'TDS', label: 'TDS' }, { value: 'Other', label: 'Other' }] },
            { key: 'client', placeholder: 'All clients', options: clients.map((c: any) => ({ value: c.id, label: c.business_name })) },
          ]}
          inputs={[
            { key: 'date_from', placeholder: 'Date from', type: 'date' },
            { key: 'date_to', placeholder: 'Date to', type: 'date' },
          ]}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No hearings found"
          body="Try adjusting your filters or schedule a hearing using the button above."
          icon={<ScrollText className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <HearingsTable hearings={items as any} />
      )}
    </div>
  );
}
