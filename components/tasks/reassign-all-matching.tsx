'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reassignTasksByFilterAction } from '@/lib/actions/tasks';
import type { TaskFilterParams } from '@/lib/tasks/filter-params';

const MAX = 500;
const UNASSIGNED = '__unassigned__';

/**
 * "Reassign all N matching" for the task list. Acts on every task the current filter
 * matches (not only the rows on this page). The server re-runs the filter and refuses
 * if the number of matches differs from the number shown here.
 */
export function ReassignAllMatching({
  total,
  team,
  filters,
}: {
  total: number;
  team: { id: string; full_name: string }[];
  filters: TaskFilterParams;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState('');
  const [pending, startTransition] = useTransition();

  const tooMany = total > MAX;
  const targetName = target === UNASSIGNED ? 'nobody (unassigned)' : team.find((m) => m.id === target)?.full_name ?? '';

  function apply() {
    if (!target) return;
    startTransition(async () => {
      const r = await reassignTasksByFilterAction({
        filters,
        assigned_to: target === UNASSIGNED ? null : target,
        expected_count: total,
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      const { updated, skipped } = r.data;
      toast.success(
        skipped > 0
          ? `Reassigned ${updated} task${updated === 1 ? '' : 's'}; ${skipped} closed task${skipped === 1 ? '' : 's'} left unchanged`
          : `Reassigned ${updated} task${updated === 1 ? '' : 's'}`,
      );
      setOpen(false);
      setTarget('');
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!pending) setOpen(v); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={total === 0} data-testid="reassign-all-open">
          <UserCog className="h-4 w-4 mr-1" /> Reassign all {total}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign all matching tasks</DialogTitle>
          <DialogDescription>
            {tooMany
              ? `${total} tasks match the current filters. Narrow the filters to ${MAX} or fewer to reassign them together.`
              : `This changes the assignee on all ${total} task${total === 1 ? '' : 's'} that match the current filters, across every page. Completed and cancelled tasks are skipped.`}
          </DialogDescription>
        </DialogHeader>

        {!tooMany && (
          <div className="space-y-3">
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger aria-label="New assignee">
                <SelectValue placeholder="Choose the new assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {target && (
              <p className="text-sm text-zinc-600" role="status">
                {total} task{total === 1 ? '' : 's'} will be assigned to <strong>{targetName}</strong>.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button onClick={apply} disabled={pending || tooMany || !target}>
            {pending ? 'Reassigning...' : `Reassign ${total} task${total === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
