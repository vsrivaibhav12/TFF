'use client';

import { useRouter } from 'next/navigation';
import { QuickActionBar } from '@/components/ui/quick-action-bar';
import {
  Plus,
  CalendarDays,
  ClipboardCheck,
  FileCheck,
  AlertTriangle,
  MessageSquare,
  Timer,
} from 'lucide-react';

export function TeamQuickActions() {
  const router = useRouter();

  const actions = [
    { label: 'New task', icon: Plus, variant: 'default' as const, onClick: () => router.push('/team/tasks') },
    { label: 'Request leave', icon: CalendarDays, variant: 'default' as const, onClick: () => router.push('/team/leave') },
    { label: 'Log work', icon: Timer, variant: 'default' as const, onClick: () => router.push('/team/work-done') },
    { label: 'Request permission', icon: ClipboardCheck, variant: 'secondary' as const, onClick: () => router.push('/team/attendance') },
    { label: 'New notice', icon: AlertTriangle, variant: 'secondary' as const, onClick: () => router.push('/team/notices') },
    { label: 'Raise query', icon: MessageSquare, variant: 'secondary' as const, onClick: () => router.push('/team/queries') },
  ];

  return <QuickActionBar actions={actions} />;
}
