import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { formatDateIST } from '@/lib/utils';
import QueryReply from '@/app/team/queries/[id]/reply';

interface Props {
  data: any;
  basePath: string;
  isModal?: boolean;
  canActAsTeam?: boolean;
}

/* ─────────── DOCK MODE ─────────── */
function QueryDockSummary({ data, basePath, canActAsTeam }: Props) {
  const q = data.query;
  const messages = data.messages;

  return (
    <div className="flex flex-col gap-5 px-5 py-5 pb-20">
      <div>
        <Badge variant={q.status === 'open' ? 'warning' : q.status === 'resolved' ? 'success' : 'teal'} className="text-[10px] mb-1">{q.status}</Badge>
        <h1 className="text-lg font-semibold text-zinc-900 leading-tight">{q.subject}</h1>
        <span className="text-xs text-zinc-500 mt-1 block">{q.clients?.business_name}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-zinc-100 bg-white p-2.5">
          <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Created by</div>
          <div className="text-[13px] font-semibold text-zinc-900 mt-0.5">{q.users_profile?.full_name ?? 'Client user'}</div>
        </div>
        <div className="rounded-lg border border-zinc-100 bg-white p-2.5">
          <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Created</div>
          <div className="text-[13px] font-semibold text-zinc-900 mt-0.5">{formatDateIST(q.created_at)}</div>
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-zinc-700 mb-2">Conversation ({messages.length})</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="bg-zinc-50/50 border-dashed border border-zinc-200 text-center text-xs text-zinc-500 rounded-xl p-6">No messages yet.</div>
          ) : (
            messages.map((m: any) => (
              <div key={m.id} className={`p-3 rounded-lg text-xs ${m.users_profile?.role === 'client' ? 'border border-teal-100 bg-teal-50' : 'border border-zinc-100 bg-white'}`}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-medium text-zinc-900">{m.users_profile?.full_name}</span>
                  <span className="text-zinc-400">{formatDateIST(m.created_at)}</span>
                </div>
                <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">{m.message_text}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {q.status !== 'resolved' && (
        <div>
          <h3 className="text-[13px] font-semibold text-zinc-700 mb-2">Reply</h3>
          <QueryReply queryId={q.id} canClose={q.status !== 'resolved'} canActAsTeam={canActAsTeam} />
        </div>
      )}

      <Link href={`${basePath}/${q.id}`} className="inline-flex items-center gap-1 text-xs text-teal-700 hover:underline font-medium mt-2">
        Open full query <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

/* ─────────── FULL PAGE MODE ─────────── */
function QueryFullPage({ data, basePath, canActAsTeam }: Props) {
  const q = data.query;
  const messages = data.messages;

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      <div className="flex-none mb-4">
        <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 font-medium">
          <ChevronLeft className="h-4 w-4" /> Back to Queries
        </Link>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-6">
        <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
          <div className="space-y-4">
            <h1 className="tff-page-title leading-tight">{q.subject}</h1>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <Badge variant={q.status === 'open' ? 'warning' : q.status === 'resolved' ? 'success' : 'teal'}>{q.status}</Badge>
              <span className="text-zinc-500 font-medium">{q.clients?.business_name}</span>
            </div>
          </div>

          <div className="w-full space-y-4 mt-4">
            <h3 className="font-semibold text-zinc-900 tracking-tight text-sm">Conversation</h3>
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="bg-zinc-50/50 border-dashed border border-zinc-200 text-center text-sm text-zinc-500 rounded-xl p-8">No messages yet. Be the first to reply.</div>
              ) : (
                messages.map((m: any) => (
                  <div key={m.id} className={`p-4 ${m.users_profile?.role === 'client' ? 'rounded-xl border border-teal-100 bg-teal-50' : 'tff-card'}`}>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-sm font-medium text-zinc-900">{m.users_profile?.full_name}</span>
                      <span className="text-xs text-zinc-500">{formatDateIST(m.created_at)}</span>
                    </div>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{m.message_text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="w-full mt-4">
            <h3 className="font-semibold text-zinc-900 tracking-tight text-sm mb-4">Reply</h3>
            <QueryReply queryId={q.id} canClose={q.status !== 'resolved'} canActAsTeam={canActAsTeam} />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pl-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
          <div className="tff-card p-5">
            <h3 className="font-semibold mb-3 text-zinc-900 tracking-tight text-sm">Query Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0"><dt className="text-zinc-500 text-xs">Status</dt><dd className="font-semibold text-zinc-900 capitalize">{q.status}</dd></div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0"><dt className="text-zinc-500 text-xs">Client</dt><dd className="font-semibold text-zinc-900">{q.clients?.business_name}</dd></div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0"><dt className="text-zinc-500 text-xs">Created By</dt><dd className="font-semibold text-zinc-900">{q.users_profile?.full_name ?? 'Client user'}</dd></div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0"><dt className="text-zinc-500 text-xs">Created At</dt><dd className="font-semibold text-zinc-900">{formatDateIST(q.created_at)}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── ENTRY ─────────── */
export default function QueryDetailShell(props: Props) {
  if (props.isModal) return <QueryDockSummary {...props} />;
  return <QueryFullPage {...props} />;
}
