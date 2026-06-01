import { notFound } from 'next/navigation';
import { getQueryWithMessages } from '@/lib/repositories/queries';
import QueryDetailShell from '@/components/queries/query-detail-shell';

export const dynamic = 'force-dynamic';

export default async function TeamQueryDetail({ params }: { params: { id: string } }) {
  const data = await getQueryWithMessages(params.id);
  if (!data) notFound();
  return <QueryDetailShell data={data} basePath="/team/queries" canActAsTeam={true} />;
}
