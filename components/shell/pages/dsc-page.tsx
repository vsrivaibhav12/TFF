import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listDscRecords } from '@/lib/repositories/dsc';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DscDialog from '@/components/dsc/dsc-dialog';
import EmptyState from '@/components/sophistication/empty-state';
import { formatDateIST } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';

import FilterBar from '@/components/sophistication/filter-bar';
import { ViewTabs } from '@/components/ui/view-tabs';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { query?: string; v?: string };
}

export default async function DscPage({ searchParams }: Props) {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'dsc.view');
  const [items, clients] = await Promise.all([listDscRecords(), listAccessibleClients()]);
  const today = new Date();

  let filteredItems = items;
  if (searchParams.query) {
    const q = searchParams.query.toLowerCase();
    filteredItems = items.filter((d: any) =>
      d.holder_name?.toLowerCase().includes(q) ||
      (d.clients?.business_name ?? '').toLowerCase().includes(q)
    );
  }

  // Views: expiring within 30 days, expired, or everything. Counts follow the search.
  const daysTo = (d: any) => (d.expiry_date ? differenceInDays(parseISO(d.expiry_date), today) : null);
  const counts = {
    all: filteredItems.length,
    soon: filteredItems.filter((d: any) => { const n = daysTo(d); return n !== null && n >= 0 && n <= 30; }).length,
    expired: filteredItems.filter((d: any) => { const n = daysTo(d); return n !== null && n < 0; }).length,
  };
  const view = searchParams.v === 'soon' || searchParams.v === 'expired' ? searchParams.v : 'all';
  if (view === 'soon') filteredItems = filteredItems.filter((d: any) => { const n = daysTo(d); return n !== null && n >= 0 && n <= 30; });
  if (view === 'expired') filteredItems = filteredItems.filter((d: any) => { const n = daysTo(d); return n !== null && n < 0; });
  const tabHref = (v: string) => {
    const qs = new URLSearchParams();
    if (searchParams.query) qs.set('query', searchParams.query);
    if (v !== 'all') qs.set('v', v);
    const s = qs.toString();
    return s ? `?${s}` : '?';
  };

  const exportData = (filteredItems ?? []).map((d: any) => ({
    client: d.clients?.business_name ?? '',
    holder: d.holder_name,
    class: d.dsc_class,
    type: d.dsc_type,
    expiry: d.expiry_date ?? '',
    status: d.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="DSC Vault"
        subtitle="Digital signature certificates across the firm. Alerts fire 30 days before expiry."
        actions={
          <>
            <ExportButton data={exportData} filename="dsc-export" format="csv" />
            <DscDialog clients={clients as any}><Button data-testid="dsc-new">New DSC</Button></DscDialog>
          </>
        }
      />

      <ViewTabs
        label="DSC views"
        tabs={[
          { key: 'all', label: 'All certificates', count: counts.all, href: tabHref('all'), active: view === 'all' },
          { key: 'soon', label: 'Expiring in 30 days', count: counts.soon, href: tabHref('soon'), active: view === 'soon', tone: 'warning' },
          { key: 'expired', label: 'Expired', count: counts.expired, href: tabHref('expired'), active: view === 'expired', tone: 'danger' },
        ]}
      />

      <FilterBar inputs={[{ key: 'query', placeholder: 'Search holder or client...' }]} />

      {filteredItems.length === 0 ? (
        <EmptyState
          title={view === 'all' && !searchParams.query ? 'No DSCs registered' : 'No certificates match'}
          body={view === 'all' && !searchParams.query ? 'Add the first digital signature certificate to start tracking expiries.' : 'Try another view or clear the search.'}
          variant="key"
        />
      ) : (
        <div className="tff-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead><TableHead>Holder</TableHead>
                <TableHead>Class / Type</TableHead><TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((d: any) => {
                const days = d.expiry_date ? differenceInDays(parseISO(d.expiry_date), today) : null;
                let chip: 'success' | 'warning' | 'danger' | 'outline' = 'outline';
                if (days !== null) {
                  chip = days < 0 ? 'danger' : days <= 30 ? 'warning' : 'success';
                }
                return (
                  <TableRow key={d.id} data-testid={`dsc-row-${d.id}`}>
                    <TableCell className="font-medium">{d.clients?.business_name}</TableCell>
                    <TableCell>{d.holder_name}</TableCell>
                    <TableCell><span className="text-xs">{d.dsc_class} · {d.dsc_type}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{formatDateIST(d.expiry_date)}</span>
                        {days !== null && (
                          <Badge variant={chip}>{days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={d.status === 'active' ? 'success' : 'outline'}>{d.status}</Badge></TableCell>
                    <TableCell><DscDialog clients={clients as any} initial={d}><button className="text-xs text-[#0D9488] hover:underline font-medium">Edit</button></DscDialog></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      )}
    </div>
  );
}
