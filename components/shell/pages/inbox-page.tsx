import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listUnifiedInbox } from '@/lib/repositories/inbox';
import { PageHeader } from '@/components/ui/page-header';
import { InboxFeed } from '@/components/inbox/inbox-feed';


export default async function InboxPage(_props: unknown, rolePrefix: string) {
  const me = await requireRole(['admin', 'team']);
  if (rolePrefix === '/team') await requireCapabilityOrRedirect(me, 'tasks.view');
  const items = await listUnifiedInbox({ limit: 200 });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbox"
        subtitle={rolePrefix === '/team' ? 'Your chronological feed of assigned tasks and compliance events.' : 'Chronological feed of tasks and compliance events across all clients.'}
      />
      <InboxFeed items={items} basePath={rolePrefix} />
    </div>
  );
}
