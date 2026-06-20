'use client';

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { ResizableTableHead } from '@/components/ui/resizable-table-head';
import { ExpandableCell } from '@/components/ui/expandable-cell';
import { Badge } from '@/components/ui/badge';
import { formatDateIST, formatTimeIST, displayTaskName } from '@/lib/utils';
import { WorkDoneRowActions } from '@/components/operations/work-done-actions';
import { useColumnWidths } from '@/lib/hooks/use-column-widths';

interface Props {
  logs: any[];
  clients: any[];
  tasks: any[];
  canViewAll: boolean;
  canManage: boolean;
  currentUserId: string;
  role: 'admin' | 'team';
}

const COL_KEYS = ['date', 'staff', 'time', 'activity', 'duration', 'context', 'actions'];

export default function WorkDoneTable({ logs, clients, tasks, canViewAll, canManage, currentUserId, role }: Props) {
  const { widths, setWidth, loaded } = useColumnWidths(`work-done-${role}`, {
    date: 110,
    staff: 140,
    time: 110,
    activity: 260,
    duration: 90,
    context: 180,
    actions: 70,
  });

  return (
    <div className="tff-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[800px]" style={{ tableLayout: 'fixed' }}>
          <TableHeader>
            <TableRow>
              <ResizableTableHead width={loaded ? widths.date : undefined} onResize={(w) => setWidth('date', w)}>Date</ResizableTableHead>
              {canViewAll && (
                <ResizableTableHead width={loaded ? widths.staff : undefined} onResize={(w) => setWidth('staff', w)}>Staff</ResizableTableHead>
              )}
              <ResizableTableHead width={loaded ? widths.time : undefined} onResize={(w) => setWidth('time', w)}>Time</ResizableTableHead>
              <ResizableTableHead width={loaded ? widths.activity : undefined} onResize={(w) => setWidth('activity', w)}>Activity</ResizableTableHead>
              <ResizableTableHead width={loaded ? widths.duration : undefined} onResize={(w) => setWidth('duration', w)}>Duration</ResizableTableHead>
              <ResizableTableHead width={loaded ? widths.context : undefined} onResize={(w) => setWidth('context', w)}>Context</ResizableTableHead>
              <ResizableTableHead width={loaded ? widths.actions : undefined} className="w-16">Actions</ResizableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{formatDateIST(l.work_date)}</TableCell>
                {canViewAll && (
                  <TableCell className="text-sm text-zinc-600">{l.users_profile?.full_name ?? '—'}</TableCell>
                )}
                <TableCell className="text-xs text-zinc-500">
                  {l.started_at ? formatTimeIST(l.started_at) : '—'}
                  {' – '}
                  {l.ended_at ? formatTimeIST(l.ended_at) : '—'}
                </TableCell>
                <TableCell>
                  <ExpandableCell className="max-w-[300px]" maxLines={1}>
                    {l.note ?? '—'}
                  </ExpandableCell>
                </TableCell>
                <TableCell>{l.duration_minutes}m</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {l.client_id && (
                      <span className="text-[10px] text-zinc-500 uppercase">
                        {l.clients?.business_name ?? 'Archived client'}
                      </span>
                    )}
                    {l.task_id && (
                      <Badge variant="outline" className="text-[10px] py-0">
                        {l.tasks ? displayTaskName(l.tasks) : 'Archived task'}
                      </Badge>
                    )}
                    {!l.client_id && !l.task_id && <span className="text-zinc-400">—</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <WorkDoneRowActions
                    entry={l}
                    canEdit={canManage && (role === 'admin' || l.user_id === currentUserId)}
                    clients={clients}
                    tasks={tasks}
                  />
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={canViewAll ? 7 : 6} className="text-center py-12 text-zinc-500">
                  No work logged yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
