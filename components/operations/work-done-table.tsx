'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { ResizableTableHead } from '@/components/ui/resizable-table-head';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  userRole: 'admin' | 'team';
}

const COL_KEYS = ['date', 'staff', 'time', 'activity', 'duration', 'context', 'actions'];

export default function WorkDoneTable({ logs, clients, tasks, canViewAll, canManage, currentUserId, userRole }: Props) {
  const { widths, setWidth, loaded } = useColumnWidths(`work-done-${userRole}`, {
    date: 110,
    staff: 140,
    time: 110,
    activity: 260,
    duration: 90,
    context: 180,
    actions: 70,
  });

  const [selected, setSelected] = React.useState<any>(null);

  return (
    <>
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
                    <button
                      type="button"
                      onClick={() => setSelected(l)}
                      className="max-w-[300px] truncate text-left hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 rounded"
                      title="Click to view full note"
                    >
                      {l.note ?? '—'}
                    </button>
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
                      canEdit={canManage && (userRole === 'admin' || l.user_id === currentUserId)}
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

      {selected && (
        <Dialog open onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Work log entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Activity note</div>
                <p className="mt-1 text-zinc-800 whitespace-pre-wrap">{selected.note ?? '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Date</div>
                  <div className="mt-1">{formatDateIST(selected.work_date)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Time</div>
                  <div className="mt-1">
                    {selected.started_at ? formatTimeIST(selected.started_at) : '—'}
                    {' – '}
                    {selected.ended_at ? formatTimeIST(selected.ended_at) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Duration</div>
                  <div className="mt-1">{selected.duration_minutes}m</div>
                </div>
                {canViewAll && (
                  <div>
                    <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Staff</div>
                    <div className="mt-1">{selected.users_profile?.full_name ?? '—'}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Client</div>
                  <div className="mt-1">{selected.clients?.business_name ?? (selected.client_id ? 'Archived client' : '—')}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Task</div>
                  <div className="mt-1">
                    {selected.tasks ? displayTaskName(selected.tasks) : (selected.task_id ? 'Archived task' : '—')}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
