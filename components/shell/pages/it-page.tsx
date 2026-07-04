import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listItFilingsForClients } from '@/lib/repositories/compliance';
import { formatCurrencyINR, formatDateIST } from '@/lib/utils';
import { FileText } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import { Badge } from '@/components/ui/badge';
import ExportButton from '@/components/sophistication/export-button';
import ItEntryForm from '@/components/compliance/it-entry-form';

export const dynamic = 'force-dynamic';

interface Props {
  rolePrefix: string;
}

export default async function ItPage({ rolePrefix }: Props) {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'compliance.enter');
  const clients = await listAccessibleClients();
  const clientIds = clients.map((c: any) => c.id);
  const allFilings = await listItFilingsForClients(clientIds);

  const filingsByClient = allFilings.reduce((acc: any, f: any) => {
    (acc[f.client_id] = acc[f.client_id] || []).push(f);
    return acc;
  }, {});

  const clientItData = clients.map((client: any) => ({
    client,
    filings: filingsByClient[client.id] || [],
  }));

  const totalFilings = clientItData.reduce((sum, c) => sum + c.filings.length, 0);

  const exportData = clientItData.flatMap(({ client, filings }) =>
    filings.map((f: any) => ({
      client_name: client.business_name,
      fy_ending_year: f.fy_ending_year,
      status: f.status,
      filed_date: f.filed_date ?? '',
      ack_number: f.ack_number ?? '',
      taxable_income: f.taxable_income ?? '',
    }))
  );

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Income tax filings</h1>
          <p className="tff-page-subtitle">Record and review income tax returns across all clients. {totalFilings} filings on record.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={exportData} filename="it-filings" format="excel" />
        </div>
      </div>

      {clients.length === 0 ? (
        <EmptyState icon={<FileText className="h-6 w-6 text-zinc-400" />} title="No clients" body="Add clients before recording income tax filings." />
      ) : (
        <div className="space-y-6">
          {clientItData.map(({ client, filings }) => (
            <section key={client.id} className="border border-zinc-200 rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-zinc-900">{client.business_name}</h2>
                  <p className="text-sm text-zinc-500">{filings.length} filing{filings.length === 1 ? '' : 's'}</p>
                </div>
                <ItEntryForm clientId={client.id} clientName={client.business_name} />
              </div>

              {filings.length === 0 ? (
                <p className="text-sm text-zinc-400">No income tax filings recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-zinc-500 border-b border-zinc-100">
                      <tr>
                        <th className="text-left py-2 font-medium">FY ending</th>
                        <th className="text-left py-2 font-medium">Status</th>
                        <th className="text-left py-2 font-medium">Filed on</th>
                        <th className="text-left py-2 font-medium">Ack #</th>
                        <th className="text-right py-2 font-medium">Taxable income</th>
                        <th className="text-right py-2 font-medium">Tax liability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filings.map((f: any) => (
                        <tr key={f.id} className="border-b border-zinc-50 last:border-0">
                          <td className="py-2">{f.fy_ending_year}</td>
                          <td className="py-2"><StatusBadge status={f.status} /></td>
                          <td className="py-2">{f.filed_date ? formatDateIST(f.filed_date) : '—'}</td>
                          <td className="py-2">{f.ack_number || '—'}</td>
                          <td className="py-2 text-right">{f.taxable_income != null ? formatCurrencyINR(f.taxable_income) : '—'}</td>
                          <td className="py-2 text-right">{f.tax_liability != null ? formatCurrencyINR(f.tax_liability) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: Record<string, string> = {
    filed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-yellow-100 text-yellow-700',
    data_received: 'bg-purple-100 text-purple-700',
    not_started: 'bg-zinc-100 text-zinc-600',
  };
  return <Badge className={variant[status] ?? variant.not_started}>{status.replace('_', ' ')}</Badge>;
}
