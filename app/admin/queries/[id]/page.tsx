import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { getQueryWithMessages } from '@/lib/repositories/queries';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';
import { formatDateIST } from '@/lib/utils';
import QueryReply from '@/app/team/queries/[id]/reply';
import QueryDetailShell from '@/components/queries/query-detail-shell';

export const dynamic = 'force-dynamic';

export default async function AdminQueryDetail({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'queries.assign');
  const data = await getQueryWithMessages(id);
  if (!data) notFound();
  return <QueryDetailShell data={data} basePath="/admin/queries" canActAsTeam={true} />;
}
