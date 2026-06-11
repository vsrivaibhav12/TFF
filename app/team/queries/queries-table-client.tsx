'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DockLink } from '@/components/shell/dock-link';
import { Badge } from '@/components/ui/badge';
import { getStatusColour } from '@/lib/semantic-colours';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateIST } from '@/lib/utils';
import BulkActionsBar from '@/components/sophistication/bulk-actions-bar';
import { updateQueryStatusAction } from '@/lib/actions/queries';
import { TableToolbar, useTablePrefs } from '@/components/ui/table-enhancements';
import { cn } from '@/lib/utils';

interface QueryRow {
  id: string;
  subject: string;
  status: string;
  updated_at: string;
  clients?: { business_name: string } | null;
  creator?: { full_name: string | null } | null;
}

const DEFAULT_COLUMNS = [
  { key: 'select', label: 'Select', visible: true, optional: false },
  { key: 'subject', label: 'Subject', visible: true, optional: false },
  { key: 'client', label: 'Client', visible: true, optional: true },
  { key: 'creator', label: 'Raised by', visible: true, optional: true },
  { key: 'updated_at', label: 'Updated', visible: true, optional: true },
  { key: 'status', label: 'Status', visible: true, optional: false },
];

export default function QueriesTableClient({ queries }: { queries: QueryRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { columns, setColumns, density, setDensity } = useTablePrefs('team-queries', DEFAULT_COLUMNS, 'comfortable');

  function toggle(id: string) {
    const ns = new Set(selected);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setSelected(ns);
  }

  async function bulkChangeStatus(ids: string[], status?: string) {
    let success = 0, failed = 0;
    await Promise.all(
      ids.map(async (id) => {
        const r = await updateQueryStatusAction({ query_id: id, status: status as any });
        if (r.success) success++; else failed++;
      })
    );
    return { success, failed };
  }

  const colVisible = (key: string) => columns.find((c) => c.key === key)?.visible ?? true;
  const rowPadding = density === 'compact' ? 'py-2' : 'py-4';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <TableToolbar
          columns={columns}
          onColumnsChange={setColumns}
          density={density}
          onDensityChange={setDensity}
        />
      </div>
      <div className="tff-card overflow-hidden divide-y">
        {queries.map((q) => (
          <div key={q.id} className={cn('flex items-center gap-4 px-4 hover:bg-zinc-50', rowPadding)}>
            {colVisible('select') && (
              <Checkbox
                checked={selected.has(q.id)}
                onCheckedChange={() => toggle(q.id)}
                aria-label={`Select query ${q.subject}`}
              />
            )}
            <DockLink
              item={{ type: 'query', id: q.id }}
              href={`/team/queries/${q.id}`}
              className="flex-1 flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {colVisible('subject') && (
                    <span className="font-medium">{q.subject}</span>
                  )}
                  <div className="text-xs text-zinc-500">
                    {colVisible('client') && (
                      <span>{q.clients?.business_name}</span>
                    )}
                    {colVisible('client') && colVisible('creator') && (
                      <span className="text-zinc-300"> · </span>
                    )}
                    {colVisible('creator') && (
                      <span>{q.creator?.full_name}</span>
                    )}
                    {(colVisible('client') || colVisible('creator')) && colVisible('updated_at') && (
                      <span className="text-zinc-300"> · </span>
                    )}
                    {colVisible('updated_at') && (
                      <span>{formatDateIST(q.updated_at)}</span>
                    )}
                  </div>
                </div>
              </div>
              {colVisible('status') && (
                <Badge className={cn(getStatusColour(q.status).bg, getStatusColour(q.status).text, getStatusColour(q.status).border)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', getStatusColour(q.status).dot)} />
                  {q.status.replace(/_/g, ' ')}
                </Badge>
              )}
            </DockLink>
          </div>
        ))}
      </div>
      <BulkActionsBar
        ids={[...selected]}
        onClear={() => setSelected(new Set())}
        actions={[
          {
            type: 'select',
            label: 'Set status',
            options: [
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ],
            onApply: bulkChangeStatus,
          },
        ]}
      />
    </div>
  );
}
