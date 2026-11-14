import { fetchAll } from '@/lib/supabase/fetch-all';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { formatDateIST } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import EmptyState from '@/components/sophistication/empty-state';
import BillingActions from '@/components/billing/billing-actions';

import ExportButton from '@/components/sophistication/export-button';
import { Pagination } from '@/components/ui/pagination';
import { ViewTabs } from '@/components/ui/view-tabs';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { Wallet, Receipt, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { page?: string; v?: string };
}

export default async function BillingPage({ searchParams }: Props) {
  const sb = createClient();
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const mePromise = requireRole(['admin', 'team']);

  const view = searchParams.v === 'pending' || searchParams.v === 'billed' ? searchParams.v : 'all';

  let tasksQuery = sb
    .from('tasks')
    .select('id, task_number, title, status, bill_amount, bill_reference, billed, billed_date, completed_date, client_id, clients!tasks_client_id_fkey(business_name)', { count: 'exact' })
    .eq('is_billable', true)
    .eq('is_deleted', false);
  if (view === 'pending') tasksQuery = tasksQuery.eq('billed', false);
  if (view === 'billed') tasksQuery = tasksQuery.eq('billed', true);
  const tasksPromise = tasksQuery.order('completed_date', { ascending: false }).range(from, to);

  const aggPromise = fetchAll<{ billed: boolean; bill_amount: number | null }>(() =>
    sb.from('tasks').select('billed, bill_amount').eq('is_billable', true).eq('is_deleted', false),
  ).then((data) => ({ data }));

  const [me, { data: tasks, count }, { data: aggData }] = await Promise.all([mePromise, tasksPromise, aggPromise]);
  await requireCapabilityOrRedirect(me, 'manage_billing_entities');

  const pendingCount = (aggData ?? []).filter((t: any) => !t.billed).length;
  const totalAmount = (aggData ?? []).reduce((sum: number, t: any) => sum + (t.bill_amount || 0), 0);
  const billedCount = (aggData ?? []).length - pendingCount;
  const pendingAmount = (aggData ?? []).filter((t: any) => !t.billed).reduce((sum: number, t: any) => sum + (t.bill_amount || 0), 0);

  const exportData = (tasks ?? []).map((t: any) => ({
    task_number: t.task_number ?? '',
    title: t.title,
    client_name: t.clients?.business_name ?? '—',
    bill_amount: t.bill_amount ?? 0,
    status: t.status,
    completed_date: t.completed_date ?? '',
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing tracker"
        subtitle="Track billable tasks and mark them as billed when invoices are raised externally."
        showBreadcrumbs={false}
        actions={<ExportButton data={exportData} filename="billing-tracker" format="excel" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Billable tasks" value={(aggData ?? []).length.toLocaleString('en-IN')} icon={<Receipt className="h-5 w-5" />} />
        <StatCard label="Pending billing" value={pendingCount.toLocaleString('en-IN')} icon={<Clock className="h-5 w-5" />} tone="amber" />
        <StatCard label="Pending amount" value={`₹${pendingAmount.toLocaleString('en-IN')}`} hint={`of ₹${totalAmount.toLocaleString('en-IN')} billable in total`} icon={<Wallet className="h-5 w-5" />} />
      </div>

      <ViewTabs
        label="Billing views"
        tabs={[
          { key: 'all', label: 'All', count: (aggData ?? []).length, href: '?', active: view === 'all' },
          { key: 'pending', label: 'Pending', count: pendingCount, href: '?v=pending', active: view === 'pending', tone: 'warning' },
          { key: 'billed', label: 'Billed', count: billedCount, href: '?v=billed', active: view === 'billed' },
        ]}
      />

      {(!tasks || tasks.length === 0) ? (
        <EmptyState
          title="No billable tasks yet"
          body="Tasks marked as billable will appear here. Use the task detail page or bulk create to set the billable flag."
          variant="document"
        />
      ) : (
        <div className="tff-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                <TableHead>Task</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t: any) => (
                <TableRow key={t.id} className={t.billed ? 'opacity-60' : ''}>
                  <TableCell>
                    <div className="font-medium text-zinc-900">{t.title}</div>
                    <div className="text-xs text-zinc-500 font-mono">{t.task_number ?? '—'}</div>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-700">{t.clients?.business_name ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium text-zinc-900">
                    {t.bill_amount ? `₹${t.bill_amount.toLocaleString('en-IN')}` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {t.billed ? (
                      <Badge variant="success">Billed</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500 tabular-nums">
                    {formatDateIST(t.completed_date) || '—'}
                  </TableCell>
                  <TableCell>
                    <BillingActions taskId={t.id} billed={t.billed} billReference={t.bill_reference} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination page={page} total={count || 0} limit={limit} />
      </div>
      )}
    </div>
  );
}
