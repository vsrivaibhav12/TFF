import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTask, listTaskNotes } from '@/lib/repositories/tasks';
// SOP steps hidden from client portal per Group D.

import { Badge } from '@/components/ui/badge';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { formatDateIST } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import ClientNoteForm from './note-form';

import {
  getClientVisibleStatus,
  CLIENT_VISIBLE_LABELS,
  CLIENT_VISIBLE_VARIANTS,
} from '@/lib/services/client-visible-status';

const STUCK_REASON_FRIENDLY: Record<string, string> = {
  client_clarification: 'We need a clarification from you',
  gst_portal_down: 'GST portal is currently unavailable',
  itd_portal_down: 'Income Tax portal is currently unavailable',
  mcadown: 'MCA portal is currently unavailable',
  mismatch_investigation: 'Investigating a reconciliation mismatch',
  awaiting_third_party: 'Awaiting response from a bank, vendor or counterparty',
  awaiting_management: 'Awaiting management decision',
  dsc_issue: 'Digital signature issue — please coordinate with us',
  payment_pending: 'Awaiting tax/fee payment',
  other: 'On hold',
};

export const dynamic = 'force-dynamic';

export default async function PortalTaskDetail({ params }: { params: { id: string } }) {
  const task = await getTask(params.id);
  if (!task) notFound();
  const sb = createClient();
  const { data: client } = await sb.from('clients').select('business_name').eq('id', (task as any).client_id).single();
  const [notes] = await Promise.all([
    listTaskNotes(params.id),
  ]);
  const cs = getClientVisibleStatus(task as any);

  return (
    <div className="space-y-8 max-w-3xl">
      <Link
        href="/portal/tasks"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" /> Work status
      </Link>
      <div>
        <h1 className="tff-page-title">{task.title}</h1>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Badge variant={CLIENT_VISIBLE_VARIANTS[cs] as any} data-testid="portal-task-cs">
            {CLIENT_VISIBLE_LABELS[cs]}
          </Badge>
          <span className="text-sm text-zinc-500">
            due {formatDateIST(task.due_date)}
          </span>
          {client?.business_name && (
            <span className="text-sm text-zinc-500">· {client.business_name}</span>
          )}
        </div>
      </div>

      {cs === 'on_hold' && (
        <div className="rounded-xl border border-red-200 bg-red-50/40 p-5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <div className="font-semibold text-red-900">
              {STUCK_REASON_FRIENDLY[(task as any).stuck_reason_code] ?? 'On hold'}
            </div>
            {(task as any).stuck_reason_note && (
              <p className="text-sm text-red-800 mt-1 whitespace-pre-wrap">
                {(task as any).stuck_reason_note}
              </p>
            )}
          </div>
        </div>
      )}

      {task.description && (
        <div className="tff-card tff-card-pad">
          <h3 className="font-semibold mb-3">What we need from you</h3>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">
            {task.description}
          </p>
        </div>
      )}

      <div className="tff-card tff-card-pad">
        <h3 className="font-semibold mb-3">Conversation</h3>
        <ul className="space-y-3 text-sm">
          {notes.map((n: any) => (
            <li
              key={n.id}
              className="border-b border-zinc-100 pb-3 last:border-0"
            >
              <div className="text-xs text-zinc-500 mb-1">
                {(n.users_profile as any)?.full_name} ·{' '}
                {formatDateIST(n.created_at)}
              </div>
              <p className="whitespace-pre-wrap">{n.note_text}</p>
            </li>
          ))}
          {notes.length === 0 && (
            <li className="text-zinc-400">Nothing yet</li>
          )}
        </ul>
      </div>
      <ClientNoteForm taskId={task.id} />
    </div>
  );
}
