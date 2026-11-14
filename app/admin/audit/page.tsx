import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { createClient } from '@/lib/supabase/server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExpandableCell } from '@/components/ui/expandable-cell';
import { PageHeader } from '@/components/ui/page-header';
import { FullExport } from '@/components/reports/full-export';
import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';
import AuditFilters from './filters';
import EmptyState from '@/components/sophistication/empty-state';

import { Pagination } from '@/components/ui/pagination';

export const dynamic = 'force-dynamic';

export default async function AuditPage({ searchParams }: { searchParams: { actor?: string; action?: string; entity?: string; from?: string; to?: string; page?: string } }) {
  const me = await requireRole('admin');
  await requireCapabilityOrRedirect(me, 'audit.view');
  const sb = createClient();
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = sb
    .from('global_audit_log')
    .select('id, action, entity_type, entity_id, details, performed_by, performed_at, users_profile(full_name, email)', { count: 'exact' })
    .order('performed_at', { ascending: false })
    .range(from, to);
  if (searchParams.actor) q = q.eq('performed_by', searchParams.actor);
  if (searchParams.action) q = q.eq('action', searchParams.action);
  if (searchParams.entity) q = q.eq('entity_type', searchParams.entity);
  if (searchParams.from) q = q.gte('performed_at', searchParams.from);
  if (searchParams.to) q = q.lte('performed_at', searchParams.to);
  const { data, count } = await q;


  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit trail"
        subtitle="Every privileged action across the firm. Filterable and exportable."
        actions={<FullExport source={{ kind: 'audit', filters: { actor: searchParams.actor, action: searchParams.action, entity: searchParams.entity, from: searchParams.from, to: searchParams.to } }} label="audit entries" filename="audit" total={count ?? undefined} />}
      />
      <AuditFilters initial={searchParams} />
      <div className="tff-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
          <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Actor</TableHead><TableHead>When</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
          <TableBody>{(data ?? []).length === 0 ? (
            <TableRow><TableCell colSpan={5} className="p-0"><EmptyState title="No audit entries" body="Privileged actions will appear here once recorded." variant="document" /></TableCell></TableRow>
          ) : ((data ?? []).map((r: any) => (
            <TableRow key={r.id}>
              <TableCell><Badge variant="outline" className="font-mono text-xs">{r.action}</Badge></TableCell>
              <TableCell><span className="text-xs">{r.entity_type}</span><div className="font-mono text-xs text-zinc-500">{r.entity_id?.slice(0, 8)}</div></TableCell>
              <TableCell className="text-xs">{r.users_profile?.full_name ?? '—'}<div className="text-zinc-500">{r.users_profile?.email}</div></TableCell>
              <TableCell className="text-xs">{formatDateIST(r.performed_at)}</TableCell>
              <TableCell>
                <ExpandableCell className="font-mono text-xs text-zinc-500 max-w-[300px]" maxLines={1}>
                  {r.details ? JSON.stringify(r.details) : '—'}
                </ExpandableCell>
              </TableCell>
            </TableRow>
          )))}</TableBody>
        </Table>
      </div>
      <Pagination page={page} total={count || 0} limit={limit} />
    </div>
    </div>
  );
}
