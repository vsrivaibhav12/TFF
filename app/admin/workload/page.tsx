import Link from 'next/link';
import { requireRole } from '@/lib/auth/require-role';
import { listOpenTaskLoad } from '@/lib/repositories/tasks';
import { listTeamUsers } from '@/lib/repositories/clients';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EmptyState from '@/components/sophistication/empty-state';
import { todayIST } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;

type Bucket = 'overdue' | 'thisWeek' | 'nextWeek' | 'later' | 'noDate';

export default async function WorkloadPage() {
  await requireRole('admin');

  const [rows, team] = await Promise.all([listOpenTaskLoad(), listTeamUsers()]);

  const todayMs = Date.parse(`${todayIST()}T00:00:00Z`);
  const bucketOf = (due: string | null): Bucket => {
    if (!due) return 'noDate';
    const days = Math.round((Date.parse(`${due.slice(0, 10)}T00:00:00Z`) - todayMs) / DAY);
    if (days < 0) return 'overdue';
    if (days < 7) return 'thisWeek';
    if (days < 14) return 'nextWeek';
    return 'later';
  };

  type Row = { id: string | null; name: string; total: number; stuck: number } & Record<Bucket, number>;
  const blank = (id: string | null, name: string): Row => ({ id, name, total: 0, stuck: 0, overdue: 0, thisWeek: 0, nextWeek: 0, later: 0, noDate: 0 });

  const byUser = new Map<string, Row>();
  for (const m of team) byUser.set(m.id, blank(m.id, m.full_name || m.email));
  const unassigned = blank(null, 'Unassigned');

  for (const r of rows) {
    const target = r.assigned_to ? byUser.get(r.assigned_to) ?? unassigned : unassigned;
    target.total += 1;
    target[bucketOf(r.due_date)] += 1;
    if (r.is_stuck) target.stuck += 1;
  }

  const list = [...byUser.values(), unassigned].filter((r) => r.total > 0 || r.id).sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...list.map((r) => r.total));
  const totalOpen = rows.length;

  return (
    <div className="space-y-4">
      <PageHeader title="Workload" subtitle={`${totalOpen} open task${totalOpen === 1 ? '' : 's'} across ${team.length} team member${team.length === 1 ? '' : 's'}, grouped by due date.`} />

      {list.length === 0 ? (
        <EmptyState title="No open tasks" body="There is no pending or in-progress work to balance." variant="tasks" />
      ) : (
        <div className="tff-card overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                <TableHead>Team member</TableHead>
                <TableHead className="w-[28%]">Open tasks</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead className="text-right">This week</TableHead>
                <TableHead className="text-right">Next week</TableHead>
                <TableHead className="text-right">Later</TableHead>
                <TableHead className="text-right">No date</TableHead>
                <TableHead className="text-right">Stuck</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => {
                const href = r.id ? `/admin/tasks?assigned=${r.id}&status=pending,in_progress` : '/admin/tasks?assigned=unassigned&status=pending,in_progress';
                return (
                  <TableRow key={r.id ?? 'unassigned'} className="hover:bg-zinc-50/60">
                    <TableCell className="text-sm font-medium text-zinc-900">
                      <Link href={href} className="hover:text-teal-700">{r.name}</Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-zinc-100 overflow-hidden" role="img" aria-label={`${r.total} open tasks`}>
                          <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.round((r.total / max) * 100)}%` }} />
                        </div>
                        <span className="w-8 text-right text-sm font-semibold tabular-nums text-zinc-900">{r.total}</span>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right text-sm tabular-nums ${r.overdue > 0 ? 'font-semibold text-red-600' : 'text-zinc-500'}`}>{r.overdue}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-zinc-700">{r.thisWeek}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-zinc-700">{r.nextWeek}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-zinc-500">{r.later}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-zinc-500">{r.noDate}</TableCell>
                    <TableCell className={`text-right text-sm tabular-nums ${r.stuck > 0 ? 'font-semibold text-amber-600' : 'text-zinc-500'}`}>{r.stuck}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
