import { listRoleTemplates } from '@/lib/repositories/role-templates';
import RoleTemplatesAdmin from './role-templates-admin';
import BackButton from '@/components/sophistication/back-button';

export const dynamic = 'force-dynamic';

export default async function RoleTemplatesPage() {
  const templates = await listRoleTemplates();
  return (
    <div className="space-y-6">
      <BackButton href="/admin/team" label="Back to team" />
      <RoleTemplatesAdmin templates={templates} />
    </div>
  );
}
