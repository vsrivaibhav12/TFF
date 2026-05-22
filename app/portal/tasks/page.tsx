import { requireRole } from '@/lib/auth/require-role';
import { listTasks } from '@/lib/repositories/tasks';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container';
import EmptyState from '@/components/sophistication/empty-state';
import { Briefcase } from 'lucide-react';
import ExportButton from '@/components/sophistication/export-button';
import PortalTasksTable from './portal-tasks-table';

export const dynamic = 'force-dynamic';

export default async function PortalTasks() {
  const me = await requireRole('client');
  // WF-1: Scope tasks to this client's accessible clients only
  const clients = await listAccessibleClients();
  const clientId = clients[0]?.id || '';
  const tasks = clientId ? await listTasks({ clientId }) : [];

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
