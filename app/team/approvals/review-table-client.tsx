'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateIST } from '@/lib/utils';
import ReviewLeave from '../leave/review-leave';
import ReviewPermission from '../attendance/review-permission';
import BulkActionsBar from '@/components/sophistication/bulk-actions-bar';
import { reviewLeaveAction } from '@/lib/actions/leave';
import { reviewPermissionAction } from '@/lib/actions/permission';
import { Check, X } from 'lucide-react';

interface ReviewTableProps {
  items: any[];
  type: 'leave' | 'permission';
}

export default function ReviewTableClient({ items, type }: ReviewTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(r => r.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkApprove = async (ids: string[]) => {
    let success = 0;
    let failed = 0;
    for (const id of ids) {
      const fn = type === 'leave' ? reviewLeaveAction : reviewPermissionAction;
      const res = await fn({ id, approve: true } as any);
      if (res.success) success++;
      else failed++;
    }
    return { success, failed };
  };

  const handleBulkReject = async (ids: string[]) => {
    let success = 0;
    let failed = 0;
    for (const id of ids) {
      const fn = type === 'leave' ? reviewLeaveAction : reviewPermissionAction;
      const res = await fn({ id, approve: false } as any);
      if (res.success) success++;
      else failed++;
    }
    return { success, failed };
  };

  return (
    <div className="space-y-4">
      <BulkActionsBar
        ids={Array.from(selectedIds)}
        onClear={() => setSelectedIds(new Set())}
        actions={[
          {
            type: 'button',
            label: 'Approve',
            icon: Check,
            variant: 'default',
            onApply: handleBulkApprove,
          },
          {
            type: 'button',
            label: 'Reject',
            icon: X,
            variant: 'danger',
            onApply: handleBulkReject,
          }
        ]}
      />
      <div className="tff-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedIds.size > 0 && selectedIds.size === items.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Member</TableHead>
              {type === 'leave' ? (
                <>
                  <TableHead>Type</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Days</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                </>
              )}
              <TableHead>Reason</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.has(r.id)}
                    onCheckedChange={() => toggleOne(r.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{r.users_profile?.full_name}</TableCell>
                {type === 'leave' ? (
                  <>
                    <TableCell><Badge variant="outline">{r.leave_type}</Badge></TableCell>
                    <TableCell className="text-xs">{formatDateIST(r.from_date)} → {formatDateIST(r.to_date)}</TableCell>
                    <TableCell>{r.number_of_days}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{formatDateIST(r.request_date)}</TableCell>
                    <TableCell className="text-xs">{r.from_time ?? '—'} → {r.to_time ?? '—'}</TableCell>
                  </>
                )}
                <TableCell className="max-w-xs truncate">{r.reason ?? '—'}</TableCell>
                <TableCell>
                  {type === 'leave' ? <ReviewLeave id={r.id} /> : <ReviewPermission id={r.id} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
