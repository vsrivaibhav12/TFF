import { notFound } from 'next/navigation';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { getPayrollRunById } from '@/lib/repositories/payroll';
import PayrollDetailShell from '@/components/payroll/payroll-detail-shell';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
  rolePrefix: string;
}

export default async function PayrollDetailPage({ params, rolePrefix }: Props) {
  const { id } = parseParams(params, IdParamSchema);
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'payroll.run');
  const run = await getPayrollRunById(id);
  if (!run) notFound();
  return <PayrollDetailShell run={run} basePath={`${rolePrefix}/payroll`} />;
}
