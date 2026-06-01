import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import BulkTaskForm from './bulk-task-form';
import BackButton from '@/components/sophistication/back-button';
import { listAccessibleClients } from '@/lib/repositories/clients';

export const dynamic = 'force-dynamic';

export default async function BulkTaskCreatePage() {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'tasks.create');
  const sb = createClient();

  const [clients, { data: team }, { data: groups }, { data: templates }] = await Promise.all([
    listAccessibleClients(),
    sb.from('users_profile').select('id, full_name').eq('role', 'team').eq('is_active', true).order('full_name'),
    sb.from('client_groups').select('id, name').order('name'),
    sb.from('task_templates').select('id, name, description').eq('is_deleted', false).eq('is_active', true).order('name'),
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
        templates={templates ?? []}
      />
    </div>
  );
}
