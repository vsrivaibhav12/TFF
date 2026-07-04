import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import CommandCenter from '@/components/shell/command-center';

export const dynamic = 'force-dynamic';

export default async function TeamCommandPage() {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'tasks.view');
  return (
    <div className="py-10 px-4">
      <CommandCenter userRole={me.role as 'admin' | 'team'} />
    </div>
  );
}
