"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { promoteToAdminAction, demoteAdminAction } from "@/lib/actions/admin-hierarchy";
import { toast } from "sonner";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useConfirm } from '@/components/ui/use-confirm';
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  currentRole: string;
  isPrimeAdmin: boolean;
  canPromote: boolean;
  canDemote: boolean;
}

export default function PromoteDemoteButtons({ userId, currentRole, isPrimeAdmin, canPromote, canDemote }: Props) {
  const [pending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();
  const router = useRouter();

  async function promote() {
    const ok = await confirm({ title: 'Promote', description: 'Promote this team member to admin? They will gain full admin access.', confirmText: 'Promote' });
    if (!ok) return;
    startTransition(async () => {
      const r = await promoteToAdminAction(userId);
      if (r.success) { toast.success("Promoted to admin"); router.refresh(); }
      else toast.error(r.error);
    });
  }

  async function demote() {
    const ok = await confirm({ title: 'Demote', description: 'Demote this admin back to team role? They will lose admin access.', confirmText: 'Demote' });
    if (!ok) return;
    startTransition(async () => {
      const r = await demoteAdminAction(userId);
      if (r.success) { toast.success("Demoted to team"); router.refresh(); }
      else toast.error(r.error);
    });
  }

  return (
    <>
      <ConfirmDialog />
      {currentRole === "team" && canPromote && (
        <Button variant="outline" size="sm" onClick={promote} disabled={pending} className="gap-1">
          <ArrowUp className="h-3.5 w-3.5" /> Promote to admin
        </Button>
      )}

      {currentRole === "admin" && !isPrimeAdmin && canDemote && (
        <Button variant="outline" size="sm" onClick={demote} disabled={pending} className="gap-1 border-amber-200 text-amber-700 hover:bg-amber-50">
          <ArrowDown className="h-3.5 w-3.5" /> Demote to team
        </Button>
      )}
    </>
  );
}
