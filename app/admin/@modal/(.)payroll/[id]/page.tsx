import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { getPayrollRun } from '@/lib/repositories/payroll';
import PayrollDetailShell from '@/components/payroll/payroll-detail-shell';
import ModalWrapper from '@/components/shell/modal-wrapper';

export const dynamic = 'force-dynamic';

export default async function PayrollModalIntercept({ params }: { params: { id: string } }) {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'payroll.run');
  const run = await getPayrollRun(params.id);
  if (!run) notFound();

  return (
    <ModalWrapper>
      <div className="pt-8 px-2 md:px-4 h-full">
        <PayrollDetailShell run={run} basePath="/admin/payroll" isModal={true} />
      </div>
    </ModalWrapper>
  );
}
