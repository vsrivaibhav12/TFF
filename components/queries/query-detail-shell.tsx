import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';
import { formatDateIST } from '@/lib/utils';
import QueryReply from '@/app/team/queries/[id]/reply';

interface Props {
  data: any;
  basePath: string;
  isModal?: boolean;
  canActAsTeam?: boolean;
}

export default function QueryDetailShell({
  data,
  basePath,
  isModal,
  canActAsTeam = false,
}: Props) {
  const q = data.query;
  const messages = data.messages;

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      {!isModal && (
        <div className="flex-none mb-4">
          <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 font-medium">
            <ChevronLeft className="h-4 w-4" /> Back to Queries
          </Link>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-6">
        
        {/* LEFT COLUMN: Main Workspace (Center Stage) */}
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
                <div className="bg-zinc-50/50 border-dashed border border-zinc-200 text-center text-sm text-zinc-500 rounded-xl p-8">
                  No messages yet. Be the first to reply.
                </div>
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

        {/* RIGHT COLUMN: Sidebar (Metadata & Controls) */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pl-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
          
          <div className="tff-card p-5">
            <h3 className="font-semibold mb-3 text-zinc-900 tracking-tight text-sm">Query Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
                <dt className="text-zinc-500 text-xs">Status</dt>
                <dd className="font-semibold text-zinc-900 capitalize">{q.status}</dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
                <dt className="text-zinc-500 text-xs">Client</dt>
                <dd className="font-semibold text-zinc-900">{q.clients?.business_name}</dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
                <dt className="text-zinc-500 text-xs">Created By</dt>
                <dd className="font-semibold text-zinc-900">{q.users_profile?.full_name ?? 'Client user'}</dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
                <dt className="text-zinc-500 text-xs">Created At</dt>
                <dd className="font-semibold text-zinc-900">{formatDateIST(q.created_at)}</dd>
              </div>
            </dl>
          </div>

        </div>
      </div>
    </div>
  );
}
