import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import { MessageSquare } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import QueriesTable from './queries-table';

export const dynamic = 'force-dynamic';

export default async function AdminQueriesPage() {
  await requireRole('admin');
  const sb = createClient();

  const { data: queries } = await sb
    .from('queries')
    .select('id, subject, status, created_at, clients(business_name), users_profile:created_by(full_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  const exportData = (queries ?? []).map((q: any) => ({
    subject: q.subject,
    client: (q.clients as any)?.business_name ?? '',
    raised_by: (q.users_profile as any)?.full_name ?? 'Client user',
    status: q.status,
    created_at: q.created_at,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Queries"
        subtitle="Monitor and resolve active client communications."
        actions={<ExportButton data={exportData} filename="queries-export" format="csv" />}
      />

      {(!queries || queries.length === 0) ? (
        <EmptyState
          title="No queries yet"
          body="Client queries will appear here once raised through the portal."
          icon={<MessageSquare className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <QueriesTable queries={queries as any} />
      )}
    </div>
  );
}
