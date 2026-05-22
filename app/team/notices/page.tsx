import { listAllNotices } from '@/lib/repositories/notices';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listSavedViews } from '@/lib/actions/saved-views';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import NoticeDialog from './notice-dialog';
import EmptyState from '@/components/sophistication/empty-state';
import SavedViewsBar from '@/components/sophistication/saved-views-bar';
import FilterBar from '@/components/sophistication/filter-bar';
import { ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import NoticesTable from './notices-table';

export const dynamic = 'force-dynamic';

function buildNoticeUrl(sp: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...overrides })) {
    if (v !== undefined && v !== '' && v !== '__none__') params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/team/notices?${qs}` : '/team/notices';
}

export default async function TeamNoticesPage({ searchParams }: { searchParams: { status?: string; type?: string; client?: string; due_from?: string; due_to?: string } }) {
  const [items, clients, views] = await Promise.all([
    listAllNotices({
      status: searchParams.status,
      noticeType: searchParams.type,
      clientId: searchParams.client,
      dueFrom: searchParams.due_from,
      dueTo: searchParams.due_to,
    }),
    listAccessibleClients(),
    listSavedViews('team.notices'),
  ]);

  const statuses = [
    { value: '', label: 'All' },
    { value: 'received', label: 'Received' },
    { value: 'reply_pending', label: 'Reply pending' },
    { value: 'reply_submitted', label: 'Reply submitted' },
    { value: 'hearing_pending', label: 'Hearing pending' },
    { value: 'hearing_held', label: 'Hearing held' },
    { value: 'order_pending', label: 'Order pending' },
    { value: 'order_received', label: 'Order received' },
    { value: 'closed', label: 'Closed' },
  ];

  const exportData = (items ?? []).map((n: any) => ({
    client: n.clients?.business_name ?? '',
    type: n.notice_type,
    number: n.notice_number ?? '',
    subject: n.subject ?? '',
    due_date: n.due_date ?? '',
    amount: n.amount_involved ?? 0,
    status: n.status,
    authority: n.issuing_authority ?? '',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notices"
        subtitle="Tax department correspondence across all assigned clients."
        actions={
          <>
            <ExportButton data={exportData} filename="notices-export" format="csv" />
            <NoticeDialog clients={clients as any}><Button data-testid="notice-new">New notice</Button></NoticeDialog>
          </>
        }
      />

      <div className="space-y-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {statuses.map((f) => (
            <Link
              key={f.value}
              href={buildNoticeUrl(searchParams, { status: f.value || undefined })}
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
            { key: 'due_from', placeholder: 'Due from', type: 'date' },
            { key: 'due_to', placeholder: 'Due to', type: 'date' },
          ]}
        />
        <SavedViewsBar scope="team.notices" views={views as any} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No notices found"
          body="Try adjusting your filters or add the first notice to start tracking deadlines and hearings."
          icon={<ScrollText className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <NoticesTable notices={items as any} />
      )}
    </div>
  );
}
