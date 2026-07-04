import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { getClientById, listClientGroups, listTeamUsers } from '@/lib/repositories/clients';
import { parseParams, IdParamSchema } from '@/lib/validation/params';
import ClientForm from '@/app/admin/clients/client-form';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminClientEditPage({ params }: { params: { id: string } }) {
  const me = await requireRole('admin');
  await requireCapabilityOrRedirect(me, 'clients.edit');

  const { id } = parseParams(params, IdParamSchema);
  const [client, groups, owners] = await Promise.all([
    getClientById(id),
    listClientGroups(),
    listTeamUsers(),
  ]);

  if (!client) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/clients">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to clients
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">Edit client</h1>
        <p className="text-sm text-zinc-500 mt-1">{client.business_name}</p>
      </div>

      <ClientForm
        groups={groups}
        owners={owners}
        initial={client}
        redirectTo="/admin/clients"
      />
    </div>
  );
}
