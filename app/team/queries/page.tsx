import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import Link from 'next/link';
import { listQueries } from '@/lib/repositories/queries';
import { listSavedViews } from '@/lib/actions/saved-views';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import EmptyState from '@/components/sophistication/empty-state';
import SavedViewsBar from '@/components/sophistication/saved-views-bar';
import { MessageSquare } from 'lucide-react';
import QueriesTableClient from './queries-table-client';

export const dynamic = 'force-dynamic';

export default async function TeamQueries({ searchParams }: { searchParams: { status?: string } }) {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'queries.view');
  const status = searchParams.status?.split(',').filter(Boolean) ?? [];
  const [items, views] = await Promise.all([
    listQueries(status?.length ? { status } : { status: ['open', 'in_progress'] }),
    listSavedViews('team.queries'),
  ]);

  const exportData = (items ?? []).map((q) => ({
    subject: q.subject,
    client: q.clients?.business_name ?? '',
    status: q.status,
    priority: q.priority,
    created_at: q.created_at,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Queries"
        subtitle="Threaded Q&amp;A with your clients."
        actions={<ExportButton data={exportData} filename="queries-export" format="csv" />}
      />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {[{v:'',l:'Open + In progress'},{v:'open',l:'Open'},{v:'in_progress',l:'In progress'},{v:'resolved',l:'Resolved'},{v:'closed',l:'Closed'}].map((f) => (
            <Link key={f.v} href={f.v ? `/team/queries?status=${f.v}` : '/team/queries'} className={`rounded-md border px-3 py-1.5 text-xs ${(searchParams.status ?? '') === f.v ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-zinc-200 hover:bg-zinc-50'}`}>{f.l}</Link>
          ))}
        </div>
        <SavedViewsBar scope="team.queries" views={views ?? []} />
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="No queries match this view"
          body="Queries appear here when clients ask something through the portal, or when your team raises an internal one."
          icon={<MessageSquare className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <QueriesTableClient queries={items ?? []} />
      )}
    </div>
  );
}
