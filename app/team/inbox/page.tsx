import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listUnifiedInbox } from '@/lib/repositories/inbox';
import { PageHeader } from '@/components/ui/page-header';
import { InboxFeed } from '@/components/inbox/inbox-feed';

export const dynamic = 'force-dynamic';

export default async function TeamInboxPage() {
  const me = await requireRole(['team', 'admin']);
  await requireCapabilityOrRedirect(me, 'queries.view');
  const items = await listUnifiedInbox({ limit: 200 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        subtitle="Your chronological feed of assigned tasks, notices, queries, and compliance events."
      />
      <InboxFeed items={items} basePath="/team" />
    </div>
  );
}
