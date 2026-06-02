import { notFound } from 'next/navigation';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { getPayrollRun } from '@/lib/repositories/payroll';
import PayrollDetailShell from '@/components/payroll/payroll-detail-shell';

export const dynamic = 'force-dynamic';

export default async function PayrollDetail({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'payroll.run');
  const run = await getPayrollRun(id);
  if (!run) notFound();
  return <PayrollDetailShell run={run} basePath="/admin/payroll" />;
}
