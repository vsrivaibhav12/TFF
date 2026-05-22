import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import { Badge } from '@/components/ui/badge';
import { formatDateIST } from '@/lib/utils';
import { ClipboardList, User, Calendar } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import ReviewLeave from '@/app/team/leave/review-leave';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface LeaveRow {
  id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  number_of_days: number;
  reason: string;
  status: string;
  users_profile: { full_name: string } | null;
}

export default async function AdminLeavePage() {
  await requireRole('admin');
  const sb = createClient();

  const { data: requests } = await sb
    .from('leave_requests')
    .select('id, leave_type, from_date, to_date, number_of_days, reason, status, users_profile:user_id(full_name)')
    .order('from_date', { ascending: false })
    .limit(100);

  const rows = (requests ?? []) as unknown as LeaveRow[];
  const pendingRows = rows.filter((r) => r.status === 'pending');
  const otherRows = rows.filter((r) => r.status !== 'pending');

  const exportData = (rows ?? []).map((r) => ({
    member: r.users_profile?.full_name ?? '—',
    type: r.leave_type,
    from: r.from_date,
    to: r.to_date,
    days: r.number_of_days,
    status: r.status,
    reason: r.reason,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave management"
        subtitle="Approve or monitor team time-off requests."
        actions={<ExportButton data={exportData} filename="leave-export" format="csv" />}
      />

      {/* Pending approvals section */}
      {pendingRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900">Pending approvals ({pendingRows.length})</h2>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/30 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-amber-50/50">
                  <TableHead>Team member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRows.map((r) => (
                  <TableRow key={r.id} data-row>
                    <TableCell>
                      <div className="flex items-center gap-2 text-zinc-900 font-medium">
                        <User className="h-4 w-4 text-zinc-400" />
                        {r.users_profile?.full_name ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.leave_type}</Badge></TableCell>
                    <TableCell className="text-zinc-700 tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        {formatDateIST(r.from_date)} — {formatDateIST(r.to_date)}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{r.number_of_days}</TableCell>
                    <TableCell className="text-sm text-zinc-500 max-w-xs truncate">{r.reason}</TableCell>
                    <TableCell>
                      <ReviewLeave id={r.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* All requests history */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">
          {pendingRows.length > 0 ? 'Request history' : 'All leave requests'}
        </h2>
        {rows.length === 0 ? (
          <EmptyState
            title="No leave requests"
            body="Team leave requests will appear here once submitted."
            icon={<ClipboardList className="h-6 w-6 text-zinc-400" />}
          />
        ) : (
          <div className="tff-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-zinc-50/50">
                  <TableHead>Team member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pendingRows.length > 0 ? otherRows : rows).map((r) => (
                  <TableRow key={r.id} data-row>
                    <TableCell>
                      <div className="flex items-center gap-2 text-zinc-900 font-medium">
                        <User className="h-4 w-4 text-zinc-400" />
                        {r.users_profile?.full_name ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.leave_type}</Badge></TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          r.status === 'approved'
                            ? 'success'
                            : r.status === 'pending'
                              ? 'warning'
                              : 'destructive'
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-700 tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        {formatDateIST(r.from_date)} — {formatDateIST(r.to_date)}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{r.number_of_days}</TableCell>
                    <TableCell className="text-sm text-zinc-500 max-w-xs truncate">{r.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
