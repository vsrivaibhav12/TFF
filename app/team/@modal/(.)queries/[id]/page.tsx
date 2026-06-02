import { notFound } from 'next/navigation';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { getQueryWithMessages } from '@/lib/repositories/queries';
import QueryDetailShell from '@/components/queries/query-detail-shell';
import ModalWrapper from '@/components/shell/modal-wrapper';

export const dynamic = 'force-dynamic';

export default async function TeamQueryModalIntercept({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  const data = await getQueryWithMessages(id);
  if (!data) notFound();

  return (
    <ModalWrapper>
      <div className="pt-8 px-2 md:px-4 h-full">
        <QueryDetailShell
          data={data}
          basePath="/team/queries"
          canActAsTeam={true}
          isModal={true}
        />
      </div>
    </ModalWrapper>
  );
}
