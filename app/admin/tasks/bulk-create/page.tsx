import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import BulkTaskForm from './bulk-task-form';
import BackButton from '@/components/sophistication/back-button';

export const dynamic = 'force-dynamic';

export default async function BulkTaskCreatePage() {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'tasks.create');
  const sb = createClient();

  const [{ data: clients }, { data: team }, { data: groups }] = await Promise.all([
    sb.from('clients').select('id, business_name, group_id').eq('is_deleted', false).order('business_name').limit(5000),
    sb.from('users_profile').select('id, full_name').eq('role', 'team').eq('is_active', true).order('full_name'),
    sb.from('client_groups').select('id, name').order('name'),
  ]);

  return (
    <div className="tff-stack-lg">
      <BackButton href="/admin/tasks" />
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Bulk create tasks</h1>
          <p className="tff-page-subtitle">Create the same task for multiple clients in one go.</p>
        </div>
      </div>
      <BulkTaskForm
        clients={clients ?? []}
        team={team ?? []}
        groups={groups ?? []}
      />
    </div>
  );
}
