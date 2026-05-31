'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { replyQueryAction, closeQueryAction } from '@/lib/actions/queries';
import { useConfirm } from '@/components/ui/use-confirm';

export default function QueryReply({ queryId, canClose, canActAsTeam }: { queryId: string; canClose: boolean; canActAsTeam?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState('');
  const [ConfirmDialog, confirm] = useConfirm();

  function send() {
    if (!msg.trim()) return;
    startTransition(async () => {
      const r = await replyQueryAction({ query_id: queryId, message: msg.trim() });
      if (!r.success) toast.error(r.error);
      else { toast.success('Reply sent'); setMsg(''); router.refresh(); }
    });
  }
  async function close() {
    const ok = await confirm({ title: 'Resolve Query', description: 'Mark this query as resolved?' });
    if (!ok) return;
    startTransition(async () => {
      const r = await closeQueryAction({ query_id: queryId, resolution_notes: msg.trim() || undefined });
      if (!r.success) toast.error(r.error);
      else { toast.success('Query resolved'); setMsg(''); router.refresh(); }
    });
  }

  return (
    <>
      <ConfirmDialog />
      <div className="tff-card tff-card-pad space-y-3">
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder="Type your reply…" data-testid="reply-textarea" />
      <div className="flex gap-2">
        <Button onClick={send} disabled={pending || !msg.trim()} data-testid="reply-send">Send reply</Button>
        {canActAsTeam && canClose && <Button variant="outline" onClick={close} disabled={pending}>Mark resolved</Button>}
      </div>
    </div>
    </>
  );
}
