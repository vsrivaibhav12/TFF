export const dynamic = 'force-dynamic';
import { parseParams, ReportIdParamSchema } from '@/lib/validation/params';

import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { getBizlensReport } from '@/lib/actions/bizlens-actions';
import { listBizlensSnapshots } from '@/lib/repositories/bizlens-snapshots';
import BizlensStudioInputForm from '@/components/operations/bizlens/input-form';
import BackButton from '@/components/sophistication/back-button';

interface Props {
  params: { reportId: string };
  rolePrefix: string;
}

export default async function BizlensInputPage({ params, rolePrefix }: Props) {
  const { reportId } = parseParams(params, ReportIdParamSchema);
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'bizlens.enter');
  const report = await getBizlensReport(reportId);
  if (!report) notFound();

  const snapshots = await listBizlensSnapshots(report.client_id);
  const role = rolePrefix === '/admin' ? 'admin' : 'team';

  return (
    <div className="p-6">
      <BackButton href={`${rolePrefix}/bizlens`} />
      <div className="mb-8">
        <h1 className="tff-page-title">BizLens Studio</h1>
        <p className="tff-page-subtitle">Data entry for client diagnostic reporting.</p>
      </div>
      <BizlensStudioInputForm report={report} clientId={report.client_id} role={role} snapshots={snapshots as any} />
    </div>
  );
}
