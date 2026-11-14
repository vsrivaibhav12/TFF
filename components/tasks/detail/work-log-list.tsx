'use client';

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { formatDateIST, formatTimeIST } from '@/lib/utils';
import { fmtHM } from './helpers';

type Entry = {
  id: string;
  user_id: string;
  work_date: string;
  duration_minutes: number;
  note?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  users_profile?: { full_name: string } | null;
};

const ALL = '__all__';

/** Every work entry on a task: date and time on each row, total time, filterable by person. */
export function WorkLogList({
  entries,
  currentUserId,
  onRemove,
  removing,
}: {
  entries: Entry[];
  currentUserId: string;
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  const [person, setPerson] = useState(ALL);

  const people = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of entries) if (!seen.has(e.user_id)) seen.set(e.user_id, e.users_profile?.full_name ?? 'Unknown');
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  if (entries.length === 0) return null;

  // If the chosen person's last entry was deleted, fall back to everyone.
  const active = people.some((p) => p.id === person) ? person : ALL;
  const shown = active === ALL ? entries : entries.filter((e) => e.user_id === active);
  const totalMin = shown.reduce((n, e) => n + e.duration_minutes, 0);
  const activeName = people.find((p) => p.id === active)?.name;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-zinc-500">
          Total time{activeName ? ` by ${activeName}` : ''}{' '}
          <span className="font-semibold text-zinc-900 tabular-nums">{fmtHM(totalMin)}</span>
          <span className="mx-1">·</span>
          {shown.length} {shown.length === 1 ? 'entry' : 'entries'}
        </div>
        {people.length > 1 && (
          <Select value={active} onValueChange={setPerson}>
            <SelectTrigger className="h-7 w-40 text-xs" aria-label="Filter work log by person">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Everyone</SelectItem>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <ul className="space-y-2 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
        {shown.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex-1 min-w-0">
              <span className="font-medium tabular-nums text-xs">{fmtHM(e.duration_minutes)}</span>
              <span className="text-zinc-500 mx-1">·</span>
              <span className="text-zinc-600 text-xs">{e.users_profile?.full_name ?? 'You'}</span>
              <span className="text-zinc-500 mx-1">·</span>
              <span className="text-zinc-500 text-xs">
                {formatDateIST(e.work_date)}
                {e.started_at && e.ended_at ? `, ${formatTimeIST(e.started_at)} – ${formatTimeIST(e.ended_at)}` : ''}
              </span>
              {e.note && <div className="text-xs text-zinc-500 truncate">{e.note}</div>}
            </div>
            {e.user_id === currentUserId && (
              <button type="button" onClick={() => onRemove(e.id)} disabled={removing} className="text-zinc-500 hover:text-red-600 p-1" aria-label="Delete entry">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
