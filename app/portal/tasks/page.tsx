import { requireRole } from '@/lib/auth/require-role';
import { listTasks } from '@/lib/repositories/tasks';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container';
import EmptyState from '@/components/sophistication/empty-state';
import { Briefcase } from 'lucide-react';
import ExportButton from '@/components/sophistication/export-button';
import PortalTasksTable from './portal-tasks-table';
import { getClientVisibleStatus, CLIENT_VISIBLE_LABELS } from '@/lib/services/client-visible-status';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PortalTasks({ searchParams }: { searchParams: { status?: string } }) {
  const me = await requireRole('client');
  // WF-1: Scope tasks to this client's accessible clients only
  const clients = await listAccessibleClients();
  const clientId = clients[0]?.id || '';
  const rawTasks = clientId ? await listTasks({ clientId }) : [];

  const tasksWithStatus = rawTasks.map((t: any) => ({
    ...t,
    client_status: getClientVisibleStatus(t)
  }));

  const activeTab = searchParams.status || 'active';
  
  const tasks = tasksWithStatus.filter((t) => {
    if (activeTab === 'active') return t.client_status !== 'completed';
    return t.client_status === activeTab;
  });

  const exportData = tasks.map((t: any) => ({
    title: t.title,
    due_date: t.due_date ?? '',
    status: t.status,
    client_name: t.clients?.business_name ?? '',
  }));
  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="tff-page-title">Work status</h1>
            <p className="tff-page-subtitle">
              See what is scheduled, in progress, under review, or completed.
            </p>
          </div>
          <ExportButton data={exportData} filename="portal-tasks" format="excel" />
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="flex items-center gap-1.5 flex-wrap border-b border-zinc-200 pb-px">
          {[
            { id: 'active', label: 'Active tasks' },
            { id: 'action_required', label: 'Action required' },
            { id: 'in_progress', label: 'In progress' },
            { id: 'under_review', label: 'Under review' },
            { id: 'completed', label: 'Completed' }
          ].map((tab) => (
            <Link
              key={tab.id}
              href={`/portal/tasks${tab.id === 'active' ? '' : `?status=${tab.id}`}`}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-colors',
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </StaggerItem>

      {tasks.length === 0 ? (
        <StaggerItem>
          <EmptyState
            title="No tasks yet"
            body="Your tasks will appear here once they are assigned."
            icon={<Briefcase className="h-6 w-6 text-zinc-400" />}
          />
        </StaggerItem>
      ) : (
        <StaggerItem>
          <PortalTasksTable tasks={tasks as any} />
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}
