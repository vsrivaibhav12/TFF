'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { removeTeamMemberAction } from '@/lib/actions/team';
import { useConfirm } from '@/components/ui/use-confirm';

export default function RemoveMemberButton({ userId, isPrimeAdmin }: { userId: string; isPrimeAdmin?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  if (isPrimeAdmin) return null;

  async function onClick() {
    const ok = await confirm({ title: 'Remove Member', description: 'Remove this team member permanently? This cannot be undone.', confirmText: 'Remove' });
    if (!ok) return;
    startTransition(async () => {
      const r = await removeTeamMemberAction({ user_id: userId });
      if (r.success) {
        toast.success('Member removed');
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <>
      <ConfirmDialog />
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400 hover:text-red-600" onClick={onClick} disabled={pending}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}
