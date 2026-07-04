import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import BulkTaskForm from '@/components/tasks/bulk-task-form';
import BackButton from '@/components/sophistication/back-button';
import { listAccessibleClients } from '@/lib/repositories/clients';

export const dynamic = 'force-dynamic';

export default async function BulkTaskCreatePage({ searchParams }: { searchParams: { sub_service_id?: string } }) {
  const me = await requireRole('admin');
  await requireCapabilityOrRedirect(me, 'tasks.create');
  const sb = createClient();

  const [allClients, { data: team }, { data: groups }] = await Promise.all([
    listAccessibleClients({ limit: 5000 }),
    sb.from('users_profile').select('id, full_name').eq('role', 'team').eq('is_active', true).order('full_name'),
    sb.from('client_groups').select('id, name').order('name'),
  ]);

  let clients = allClients;
  let templates = [];
  let subServiceName = undefined;

  if (searchParams.sub_service_id) {
    const { data: sub } = await sb.from('sub_services').select('name').eq('id', searchParams.sub_service_id).single();
    if (sub) subServiceName = sub.name;

    const { data: links } = await sb.from('client_sub_services').select('client_id').eq('sub_service_id', searchParams.sub_service_id).eq('is_active', true);
    if (links) {
      const validIds = new Set(links.map(l => l.client_id));
      clients = allClients.filter((c: any) => validIds.has(c.id));
    }

    const { data: tpls } = await sb.from('task_templates').select('id, title, description').eq('sub_service_id', searchParams.sub_service_id).eq('is_deleted', false).eq('is_active', true).order('title');
    templates = tpls ?? [];
  } else {
    const { data: tpls } = await sb.from('task_templates').select('id, title, description').eq('is_deleted', false).eq('is_active', true).order('title');
    templates = tpls ?? [];
  }

  return (
    <div className="tff-stack-lg">
      <BackButton href="/admin/tasks" />
      <div className="tff-page-header">
        <div>
          <h1 className="tff-page-title">Bulk create tasks {subServiceName && `— ${subServiceName}`}</h1>
          <p className="tff-page-subtitle">Create the same task for multiple clients in one go.</p>
        </div>
      </div>
      <BulkTaskForm
        clients={clients ?? []}
        team={team ?? []}
        groups={groups ?? []}
        templates={templates ?? []}
        initialSubServiceId={searchParams.sub_service_id}
        subServiceName={subServiceName}
      />
    </div>
  );
}
