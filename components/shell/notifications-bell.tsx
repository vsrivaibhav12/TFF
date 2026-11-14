'use client';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { markAllNotificationsReadAction } from '@/lib/actions/notifications';
import { toast } from 'sonner';
import useSWR from 'swr';
import { useState, useTransition } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Item = {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

async function fetchNotifications(): Promise<{ count: number; items: Item[] }> {
  const r = await fetch('/api/notifications/unread', { cache: 'no-store' });
  if (!r.ok) throw new Error('Failed to fetch notifications');
  return r.json();
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { data, mutate } = useSWR('notifications/unread', fetchNotifications, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });

  const count = data?.count ?? 0;
  const items = data?.items ?? [];

  function markAll() {
    startTransition(async () => {
      const res = await markAllNotificationsReadAction();
      if (res.success) {
        toast.success('All marked as read');
        await mutate();
      } else {
        toast.error(res.error);
      }
    });
  }

  // Radix popover: closes on outside click and Escape, traps focus correctly, and no
  // longer disappears when the pointer drifts off the panel.
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid="notifications-bell"
          aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span
              data-testid="notifications-unread-count"
              className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold text-white"
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      {open && (
        <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="text-sm font-semibold">Notifications</div>
            <button
              onClick={markAll}
              disabled={pending || count === 0}
              className="text-xs text-teal-700 hover:underline disabled:text-slate-500 disabled:no-underline"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">You&apos;re all caught up.</div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'px-4 py-3 border-b border-slate-100 last:border-b-0',
                    !n.is_read && 'bg-teal-50/40',
                  )}
                >
                  <div className="text-sm font-medium text-slate-900">{n.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2 border-t border-slate-200">
            <Link
              href="/account/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-teal-700 hover:underline"
            >
              All notifications &amp; preferences →
            </Link>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
