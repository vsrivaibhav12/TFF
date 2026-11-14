'use client';

import { useRouter } from 'next/navigation';
import { QuickActionBar } from '@/components/ui/quick-action-bar';
import {
  Plus,
  Users,
  Timer,
  Layers,
  CalendarClock } from 'lucide-react';

export function AdminQuickActions() {
  const router = useRouter();

  const actions = [
    { label: 'New task', icon: Plus, variant: 'default' as const, onClick: () => router.push('/admin/tasks') },
    { label: 'New client', icon: Users, variant: 'secondary' as const, onClick: () => router.push('/admin/clients') },
    { label: 'Log work', icon: Timer, variant: 'secondary' as const, onClick: () => router.push('/admin/work-done') },
    { label: 'Deadline tasks', icon: CalendarClock, variant: 'secondary' as const, onClick: () => router.push('/admin/compliance/create-tasks') },
    { label: 'Bulk tasks', icon: Layers, variant: 'secondary' as const, onClick: () => router.push('/admin/tasks/bulk-create') },
  ];

  return <QuickActionBar actions={actions} />;
}
