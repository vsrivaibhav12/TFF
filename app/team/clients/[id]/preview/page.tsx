import { parseParams, IdParamSchema } from '@/lib/validation/params';
import ClientPreview from '@/components/clients/client-preview';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default function TeamClientPreviewPage({ params }: Props) {
  const { id } = parseParams(params, IdParamSchema);
  return <ClientPreview clientId={id} rolePrefix="/team" />;
}
