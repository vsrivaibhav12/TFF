import { listDscRecords } from '@/lib/repositories/dsc';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DscDialog from './dsc-dialog';
import EmptyState from '@/components/sophistication/empty-state';
import { formatDateIST } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';
import { KeyRound } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DscPage() {
  const [items, clients] = await Promise.all([listDscRecords(), listAccessibleClients()]);
  const today = new Date();

  const exportData = (items ?? []).map((d: any) => ({
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

      {items.length === 0 ? (
        <EmptyState
          title="No DSCs registered"
          body="Add the first digital signature certificate to start tracking expiries."
          icon={<KeyRound className="h-6 w-6 text-zinc-400" />}
          actionOnClick={() => document.querySelector<HTMLButtonElement>('[data-testid="dsc-new"]')?.click()}
          actionLabel="Add DSC"
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
              {items.map((d: any) => {
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
