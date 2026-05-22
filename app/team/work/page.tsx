import { requireRole } from '@/lib/auth/require-role';
import { listTasks } from '@/lib/repositories/tasks';
import { listQueries } from '@/lib/repositories/queries';
import { listAccessibleClients, listTeamUsers } from '@/lib/repositories/clients';
import { enrichTasksWithProgress } from '@/lib/repositories/tasks';
import { todayIST } from '@/lib/utils';
import {
  Briefcase,
  AlertTriangle,
  Clock,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { TaskBoard } from '@/components/tasks/task-board';
import EmptyState from '@/components/sophistication/empty-state';
import NewTaskDialog from '@/components/tasks/new-task-dialog';

export const dynamic = 'force-dynamic';

function toWorkItem(task: any): any {
  return {
    ...task,
    work_item_type: 'task',
    work_item_label: 'Task',
    progress_pct: task.progress_pct ?? 0,
  };
}

function queryToWorkItem(query: any): any {
  return {
    id: query.id,
    title: query.subject ?? 'Query',
    status: query.status === 'resolved' ? 'completed' : query.status === 'in_progress' ? 'in_progress' : 'pending',
    priority: query.priority ?? 'medium',
    due_date: null,
    client_id: query.client_id,
    clients: query.clients,
    assigned_to: query.assigned_to,
    work_item_type: 'query',
    work_item_label: 'Query',
    progress_pct: query.status === 'resolved' ? 100 : 0,
    is_query: true,
  };
}

export default async function TeamWorkHub() {
  const me = await requireRole(['team', 'admin']);

  const todayIso = todayIST();

  const [rawTasks, queries, clients, team] = await Promise.all([
    listTasks({ assignedTo: me.id, limit: 200 }),
    listQueries({ status: ['open', 'in_progress'] }),
    listAccessibleClients(),
    listTeamUsers(),
  ]);

  const tasks = await enrichTasksWithProgress(rawTasks ?? []);
  const taskItems = (tasks ?? []).map(toWorkItem);
  const queryItems = (queries ?? []).map(queryToWorkItem);

  const allWorkItems = [...taskItems, ...queryItems];

  const total = allWorkItems.length;
  const todo = allWorkItems.filter((w) => w.status === 'pending' && !w.is_blocked_on_client && !w.is_stuck).length;
  const inProgress = allWorkItems.filter((w) => w.status === 'in_progress' && !w.is_blocked_on_client && !w.is_stuck).length;
  const pendingReview = allWorkItems.filter((w) => w.is_blocked_on_client || w.is_stuck || w.status === 'review').length;
  const dueToday = allWorkItems.filter((w) => w.due_date === todayIso).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">My work</h1>
          <p className="text-sm text-zinc-500 mt-1">Your tasks and queries in one place.</p>
        </div>
        <NewTaskDialog clients={clients as any} team={team as any} mode="team" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total items" value={total} icon={<Briefcase className="h-4 w-4" />} />
        <StatCard label="To do" value={todo} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="In progress" value={inProgress} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Due today" value={dueToday} icon={<AlertTriangle className="h-4 w-4" />} tone="warning" />
      </div>

      {allWorkItems.length === 0 ? (
        <EmptyState
          title="No work items found"
          body="Tasks are auto-created from sub-services, or you can add one manually."
          icon={<Briefcase className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <TaskBoard tasks={allWorkItems as any} hrefPrefix="/team/tasks" />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, tone = 'default' }: { label: string; value: number; icon: React.ReactNode; tone?: 'default' | 'warning' }) {
  return (
    <div className="rounded-2xl bg-white p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tone === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-500'}`}>
        {icon}
      </div>
      <div className="mt-3">
        <div className={`text-2xl font-bold tabular-nums tracking-tight ${tone === 'warning' ? 'text-amber-600' : 'text-zinc-900'}`}>{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mt-1">{label}</div>
      </div>
    </div>
  );
}
