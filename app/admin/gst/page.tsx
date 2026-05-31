import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listGstFilingsForClients } from '@/lib/repositories/compliance';
import { getGstMonthlyDataForClients } from '@/lib/repositories/gst';
import { formatCurrencyINR, formatDateIST } from '@/lib/utils';
import { FileText, ArrowRight, Calculator, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import EmptyState from '@/components/sophistication/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import GstEntryForm from './gst-entry-form';
import GstCharts from '@/components/gst/gst-charts';
import ExportButton from '@/components/sophistication/export-button';

export const dynamic = 'force-dynamic';

export default async function AdminGstPage() {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'compliance.enter');
  const clients = await listAccessibleClients();

  const clientIds = clients.map((c: any) => c.id);

  const [allFilings, allMonthlyData] = await Promise.all([
    listGstFilingsForClients(clientIds),
    getGstMonthlyDataForClients(clientIds),
  ]);

  const filingsByClient = allFilings.reduce((acc: any, f: any) => {
    (acc[f.client_id] = acc[f.client_id] || []).push(f);
    return acc;
  }, {});

  const monthlyDataByClient = allMonthlyData.reduce((acc: any, d: any) => {
    (acc[d.client_id] = acc[d.client_id] || []).push(d);
    return acc;
  }, {});

  const clientGstData = clients.map((client: any) => ({
    client,
    filings: filingsByClient[client.id] || [],
    monthlyData: monthlyDataByClient[client.id] || [],
  }));

  const totalFilings = clientGstData.reduce((sum, c) => sum + c.filings.length, 0);

  const exportData = clientGstData.flatMap(({ client, filings }) =>
    filings.map((f: any) => ({
      client_name: client.business_name,
      return_type: f.return_type,
      period_month: f.period_month,
      period_year: f.period_year,
      status: f.status,
      filed_date: f.filed_date ?? '',
      ack_number: f.ack_number ?? '',
      taxable_turnover: f.taxable_turnover ?? '',
    }))
  );

  return (
    <div className="tff-stack-lg">
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">GST filings</h1>
          <p className="tff-page-subtitle">Record and review GST returns across all clients. {totalFilings} filings on record.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={exportData} filename="gst-filings" format="excel" />
          <Link href="/admin/gst/monthly-data">
            <Button variant="outline" size="sm"><Calculator className="h-4 w-4 mr-1" /> Monthly data</Button>
          </Link>
        </div>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="Create clients to start recording GST filings."
          icon={<FileText className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="space-y-6">
          {clientGstData.map(({ client, filings, monthlyData }) => (
            <div key={client.id} className="tff-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="tff-subsection">{client.business_name}</h3>
                  <p className="tff-caption">{client.gstin || 'No GSTIN'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <GstEntryForm clientId={client.id} clientName={client.business_name} />
                </div>
              </div>

              {monthlyData.length > 0 && (
                <div className="mb-5 tff-card tff-card-pad">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-teal-600" />
                    <h4 className="text-sm font-semibold text-zinc-800">Monthly summary charts</h4>
                  </div>
                  <GstCharts data={monthlyData as any} clientId={client.id} />
                </div>
              )}

              {filings.length === 0 ? (
                <p className="text-sm text-zinc-500">No GST filings recorded.</p>
              ) : (
                <div className="tff-card overflow-hidden divide-y">
                  {filings.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-3">
                      <div>
                        <div className="text-sm font-medium">
                          {f.return_type} · {f.period_month}/{f.period_year}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {f.filed_date ? `Filed ${formatDateIST(f.filed_date)}` : 'Not filed'} · ack {f.ack_number || '—'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">
                          {f.taxable_turnover ? formatCurrencyINR(Number(f.taxable_turnover), { compact: true }) : '—'}
                        </span>
                        <Badge variant={f.status === 'filed' ? 'success' : f.status === 'review' ? 'warning' : 'outline'}>
                          {f.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
