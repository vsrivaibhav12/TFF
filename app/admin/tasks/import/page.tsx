export const dynamic = 'force-dynamic';

import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import TaskImportForm from './task-import-form';

export const metadata = { title: 'Bulk Import Tasks | The Fiscal Fulcrum' };

export default async function TaskImportPage() {
  const me = await requireRole(['admin', 'team']);
  await requireCapability(me, 'tasks.create');

  return (
    <div className="p-6">
      <TaskImportForm />
    </div>
  );
}
