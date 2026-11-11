import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { hasCapability, requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { PageHeader } from '@/components/ui/page-header';
import EmptyState from '@/components/sophistication/empty-state';
import CreateDeadlineTasks from '@/components/compliance/create-deadline-tasks';
import { listTeamUsers } from '@/lib/repositories/clients';
import { countOpenTasksByAssignee, listSchedulableSubServices } from '@/lib/repositories/deadlines';

export const dynamic = 'force-dynamic';

export default async function DeadlineTasksPage(_props: unknown, rolePrefix: string) {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'compliance.generate_tasks');

  const sb = createClient();
  const [subServices, team, loads, canRemember] = await Promise.all([
    listSchedulableSubServices(sb),
    listTeamUsers(),
    countOpenTasksByAssignee(sb),
    me.role === 'admin' ? Promise.resolve(true) : hasCapability(me, 'services.assign'),
  ]);

  return (
    <div className="space-y-5 max-w-5xl">
      <Link href={rolePrefix === '/admin' ? '/admin/compliance' : '/team'} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> {rolePrefix === '/admin' ? 'Compliance' : 'Home'}
      </Link>
      <PageHeader
        title="Create tasks for a deadline"
        subtitle="Pick a service and period, assign the people, and create a task for every linked client in one go."
      />
      {subServices.length === 0 ? (
        <EmptyState
          title="No services with a period yet"
          body="Services that have a period, such as GSTR-1 or TDS returns, appear here. Set a period on a service in the service catalogue."
          variant="generic"
        />
      ) : (
        <CreateDeadlineTasks
          subServices={subServices.map((s) => ({ id: s.id, code: s.code, name: s.name, period_type: s.period_type, frequency: s.frequency, service_name: s.service_name }))}
          team={team.map((u: { id: string; full_name: string }) => ({ id: u.id, full_name: u.full_name }))}
          loads={loads}
          canRememberDefaults={canRemember}
          basePath={rolePrefix}
        />
      )}
    </div>
  );
}
