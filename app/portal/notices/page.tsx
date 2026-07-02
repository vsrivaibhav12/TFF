import { ensureModuleVisible } from '@/lib/auth/portal-visibility';
import { requireRole } from '@/lib/auth/require-role';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listAllNotices } from '@/lib/repositories/notices';
import { Badge } from '@/components/ui/badge';
import { formatDateIST, formatCurrencyINR } from '@/lib/utils';
import { ScrollText } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import ExportButton from '@/components/sophistication/export-button';


export default async function PortalNoticesPage() {
  await ensureModuleVisible('portal.notices');
  const me = await requireRole('client');
  const clients = await listAccessibleClients();
  const clientIds = clients.map((c) => c.id);
  const items = clientIds.length > 0 ? await listAllNotices({ clientIds }) : [];

  const exportData = items.map((n: any) => ({
    notice_type: n.notice_type,
    notice_number: n.notice_number ?? '',
    subject: n.subject ?? '',
    due_date: n.due_date ?? '',
    amount: n.amount_involved ?? 0,
    status: n.status,
  }));
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="tff-page-title">Notices</h1>
          <p className="tff-page-subtitle">Notices addressed to your business and the engagement team&apos;s response status.</p>
        </div>
        <ExportButton data={exportData} filename="notices" format="excel" />
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="No notices yet"
          body="Any government or regulatory notices will appear here once received."
          icon={<ScrollText className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="tff-card overflow-hidden divide-y">
          {items.map((n: any) => (
            <div key={n.id} className="p-5" data-testid={`portal-notice-${n.id}`}>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{n.notice_type}</Badge>
                {n.notice_number && <span className="font-mono text-xs text-zinc-500">{n.notice_number}</span>}
                <Badge variant={n.status === 'closed' ? 'success' : 'warning'} className="ml-auto">{n.status.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="mt-2 font-medium">{n.subject ?? '—'}</div>
              <div className="mt-1 text-xs text-zinc-500">Due {formatDateIST(n.due_date)} · {formatCurrencyINR(n.amount_involved, { compact: true })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
