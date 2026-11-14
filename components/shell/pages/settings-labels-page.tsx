import Link from 'next/link';
import { listLabels } from '@/lib/repositories/task-custom-fields';
import LabelsAdmin from '@/app/admin/settings/labels/labels-admin';
import { ChevronLeft } from 'lucide-react';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';


export default async function LabelsPage(_props: unknown, rolePrefix: string) {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'manage_labels');
  const labels = await listLabels();
  return (
    <div className="space-y-6 max-w-3xl">
      <Link href={`${rolePrefix}/settings`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ChevronLeft className="h-4 w-4" /> Back to settings
      </Link>
      <div>
        <h1 className="tff-page-title">Task labels</h1>
        <p className="tff-page-subtitle">Flat tag system for tasks — admin-defined master list, multi-select per task.</p>
      </div>
      <LabelsAdmin initial={labels} />
    </div>
  );
}
