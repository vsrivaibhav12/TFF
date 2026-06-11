'use client';

import ClientForm from '@/app/admin/clients/client-form';
import { useDockActions } from '@/lib/state/dock-state';
import { useRouter } from 'next/navigation';

interface Props {
  groups: { id: string; name: string }[];
  owners: { id: string; full_name: string; email: string }[];
  initial?: any;
  basePath: string;
}

export default function ClientFormWrapper({ groups, owners, initial, basePath }: Props) {
  const { clear } = useDockActions();
  const router = useRouter();

  return (
    <ClientForm
      groups={groups}
      owners={owners}
      initial={initial}
      onSuccess={(clientId) => {
        router.refresh();
        if (clientId) {
          // Stay on current view, just refresh data
          router.refresh();
        }
      }}
      onDeleteSuccess={() => {
        clear();
        router.refresh();
      }}
    />
  );
}
