'use client';

import useSWR from 'swr';
import { listNotificationsAction } from '@/lib/actions/notifications';
import { markNotificationReadAction } from '@/lib/actions/notifications';
import { toast } from 'sonner';

export function useNotifications(limit = 20) {
  const { data, error, isLoading, mutate } = useSWR(
    ['notifications', limit],
    async () => {
      const r = await listNotificationsAction(limit);
      if (!r.success) throw new Error(r.error);
      return r.data ?? [];
    },
    { refreshInterval: 30_000 }
  );

  const markRead = async (id: string) => {
    const r = await markNotificationReadAction(id);
    if (!r.success) {
      toast.error(r.error ?? 'Failed to mark as read');
      return;
    }
    await mutate(
      (prev) => prev?.map((n) => (n.id === id ? { ...n, is_read: true } : n)) ?? [],
      { revalidate: false }
    );
  };

  const markAllRead = async (ids: string[]) => {
    await Promise.all(ids.map((id) => markNotificationReadAction(id)));
    await mutate(
      (prev) => prev?.map((n) => ({ ...n, is_read: true })) ?? [],
      { revalidate: false }
    );
  };

  return { notifications: data ?? [], isLoading, error, markRead, markAllRead, refresh: mutate };
}
