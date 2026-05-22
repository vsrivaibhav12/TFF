'use client';

import { useRouter } from 'next/navigation';
import { QuickActionBar } from '@/components/ui/quick-action-bar';
import {
  Plus,
  Users,
  FileCheck,
  Gavel,
  Timer,
  Receipt,
  Calculator,
  ClipboardList,
  Layers,
} from 'lucide-react';

export function AdminQuickActions() {
  const router = useRouter();

  const actions = [
    { label: 'New task', icon: Plus, variant: 'default' as const, onClick: () => router.push('/admin/tasks') },
    { label: 'New client', icon: Users, variant: 'default' as const, onClick: () => router.push('/admin/clients/new') },
    { label: 'New notice', icon: FileCheck, variant: 'secondary' as const, onClick: () => router.push('/admin/notices') },
    { label: 'Schedule hearing', icon: Gavel, variant: 'secondary' as const, onClick: () => router.push('/admin/hearings') },
    { label: 'Log work', icon: Timer, variant: 'secondary' as const, onClick: () => router.push('/admin/work-done') },
    { label: 'Run payroll', icon: Receipt, variant: 'secondary' as const, onClick: () => router.push('/admin/payroll') },
    { label: 'GST data', icon: Calculator, variant: 'secondary' as const, onClick: () => router.push('/admin/gst/monthly-data') },
    { label: 'Bulk tasks', icon: Layers, variant: 'secondary' as const, onClick: () => router.push('/admin/tasks/bulk-create') },
  ];

  return <QuickActionBar actions={actions} />;
}
