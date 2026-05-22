'use client';

import Link from 'next/link';
import { timeAgo } from '@/lib/utils';
import { FileText, UserPlus, Settings, Bell, ShieldCheck, CheckCircle2, AlertCircle, Pencil, Trash2, User, type LucideIcon } from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
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

function formatAction(action: string, entityType?: string): { text: string; icon: LucideIcon; color: string } {
  const a = action.toLowerCase();
  const et = (entityType ?? '').toLowerCase().replace(/_/g, ' ');

  if (a.includes('create')) return { text: `Created ${et}`, icon: UserPlus, color: 'bg-teal-50 text-teal-600 border-teal-100' };
  if (a.includes('delete') || a.includes('remove')) return { text: `Deleted ${et}`, icon: Trash2, color: 'bg-red-50 text-red-600 border-red-100' };
  if (a.includes('verify') || a.includes('complete')) return { text: `Verified ${et}`, icon: CheckCircle2, color: 'bg-teal-50 text-teal-600 border-teal-100' };
  if (a.includes('update') || a.includes('edit')) return { text: `Updated ${et}`, icon: Pencil, color: 'bg-blue-50 text-blue-600 border-blue-100' };
  if (a.includes('grant') || a.includes('permission') || a.includes('capability')) return { text: `Changed permissions`, icon: ShieldCheck, color: 'bg-purple-50 text-purple-600 border-purple-100' };
  if (a.includes('notice') || a.includes('alert')) return { text: `Sent notice`, icon: Bell, color: 'bg-amber-50 text-amber-600 border-amber-100' };
  if (a.includes('sign') || a.includes('login') || a.includes('auth')) return { text: `Authentication`, icon: User, color: 'bg-zinc-50 text-zinc-600 border-zinc-200' };

  return { text: `${action.replace(/_/g, ' ')} ${et}`, icon: FileText, color: 'bg-zinc-50 text-zinc-600 border-zinc-200' };
}

export function ActivityFeed({ items, href, emptyMessage = 'No recent activity' }: ActivityFeedProps) {
  // Deduplicate very similar consecutive entries and limit
  const displayItems = items.slice(0, 6);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 tracking-tight">Recent activity</h3>
          <p className="text-sm text-zinc-500 mt-0.5">Latest updates across the firm</p>
        </div>
        {href && (
          <Link href={href} className="text-sm text-teal-700 hover:underline font-medium inline-flex items-center gap-1">
            View all
          </Link>
        )}
      </div>

      {displayItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
          <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center mb-3">
            <Bell className="h-5 w-5 text-zinc-300" />
          </div>
          <p className="text-sm text-zinc-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayItems.map((item) => {
            const actor = getActor(item);
            const { text, icon: Icon, color } = formatAction(item.action, item.entity_type);
            return (
              <div key={item.id} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0" title={actor}>
                  {getInitials(actor)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-800 leading-snug">
                    <span className="font-medium">{actor}</span>{' '}
                    <span className="text-zinc-500">{text}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {timeAgo(item.performed_at)}
                  </div>
                </div>
                <div className={color.replace('bg-', 'bg-opacity-10 bg-') + ' h-7 w-7 rounded-md flex items-center justify-center shrink-0 border'}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
