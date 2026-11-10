'use client';

import Link from 'next/link';
import { timeAgo } from '@/lib/utils';
import { Bell } from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  entity_label?: string | null;
  details?: string | Record<string, unknown> | null;
  performed_at: string;
  performed_by?: { full_name?: string | null; email?: string } | { full_name?: string | null; email?: string }[] | null;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  href?: string;
  emptyMessage?: string;
}

function getActor(item: ActivityItem): string {
  const by = Array.isArray(item.performed_by) ? item.performed_by[0] : item.performed_by;
  return by?.full_name ?? 'System';
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function sentence(text: string): string {
  const t = text.replace(/_/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Turns an audit action into a short past-tense phrase, e.g. "Updated task". */
function formatAction(action: string, entityType?: string): string {
  const a = action.toLowerCase();
  const et = (entityType ?? '').toLowerCase().replace(/_/g, ' ');

  if (a.includes('create')) return `Created ${et}`.trim();
  if (a.includes('delete') || a.includes('remove')) return `Deleted ${et}`.trim();
  if (a.includes('verify') || a.includes('complete')) return `Completed ${et}`.trim();
  if (a.includes('update') || a.includes('edit')) return `Updated ${et}`.trim();
  if (a.includes('grant') || a.includes('permission') || a.includes('capability')) return 'Changed permissions';
  if (a.includes('notice') || a.includes('alert')) return 'Sent notice';
  if (a.includes('sign') || a.includes('login') || a.includes('auth')) return 'Signed in';

  if (action.includes('.')) {
    const [subject, ...rest] = action.split('.');
    const verbs: Record<string, string> = { apply: 'Applied', approved: 'Approved', rejected: 'Rejected', assign: 'Assigned', add_note: 'Added note to', bulk_update: 'Bulk updated', bulk_reassign: 'Bulk reassigned', bulk_create: 'Bulk created' };
    const verbKey = rest.join('.');
    const verb = verbs[verbKey] ?? sentence(verbKey);
    return `${verb} ${subject.replace(/_/g, ' ')}`;
  }
  return sentence(`${action} ${et}`);
}

function entityHref(item: ActivityItem): string | null {
  if (!item.entity_id) return null;
  if (item.entity_type === 'task') return `/admin/tasks/${item.entity_id}`;
  if (item.entity_type === 'client') return `/admin/clients/${item.entity_id}`;
  return null;
}

export function ActivityFeed({ items, href, emptyMessage = 'No recent activity' }: ActivityFeedProps) {
  const displayItems = items.slice(0, 6);

  return (
    <div className="tff-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="tff-section-title">Recent activity</h3>
        {href && (
          <Link href={href} className="text-sm text-teal-700 hover:underline font-medium">
            View all
          </Link>
        )}
      </div>

      {displayItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
          <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center mb-3">
            <Bell className="h-5 w-5 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-500">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {displayItems.map((item) => {
            const actor = getActor(item);
            const link = entityHref(item);
            const label = item.entity_label;
            return (
              <li key={item.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="h-7 w-7 rounded-full bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center text-[11px] font-semibold shrink-0" title={actor}>
                  {getInitials(actor)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-700 leading-snug">
                    <span className="font-medium text-zinc-900">{actor}</span>{' '}
                    {formatAction(item.action, item.entity_type).toLowerCase()}
                    {label && (
                      <>
                        {': '}
                        {link ? (
                          <Link href={link} className="text-zinc-900 hover:text-teal-700 hover:underline">{label}</Link>
                        ) : (
                          <span className="text-zinc-900">{label}</span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 tabular-nums">{timeAgo(item.performed_at)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
