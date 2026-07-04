import { requireRole } from '@/lib/auth/require-role';
import { listUnifiedInbox } from '@/lib/repositories/inbox';
import { PageHeader } from '@/components/ui/page-header';
import { InboxFeed } from '@/components/inbox/inbox-feed';

export const dynamic = 'force-dynamic';

export default async function AdminInboxPage() {
  await requireRole('admin');
  const items = await listUnifiedInbox({ limit: 200 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        subtitle="Chronological feed of tasks, notices, queries, and compliance events across all clients."
      />
      <InboxFeed items={items} basePath="/admin" />
    </div>
  );
}
