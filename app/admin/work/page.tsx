import { requireRole } from '@/lib/auth/require-role';
import { listTasks } from '@/lib/repositories/tasks';
import { listAllNotices } from '@/lib/repositories/notices';
import { listQueries } from '@/lib/repositories/queries';
import { enrichTasksWithProgress } from '@/lib/repositories/tasks';
import { todayIST } from '@/lib/utils';
import Link from 'next/link';
import {
  Briefcase,
  AlertTriangle,
  Clock,
  Bell,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { TaskBoard } from '@/components/tasks/task-board';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

function toWorkItem(task: any): any {
  return {
    ...task,
    work_item_type: 'task',
    work_item_label: 'Task',
    progress_pct: task.progress_pct ?? 0,
  };
}

function noticeToWorkItem(notice: any): any {
  return {
    id: notice.id,
    title: notice.subject ?? 'Notice',
    status: 'pending',
    priority: 'high',
    due_date: notice.due_date,
    client_id: notice.client_id,
    clients: notice.clients,
    assigned_to: notice.assigned_to,
    users_profile: notice.users_profile,
    work_item_type: 'notice',
    work_item_label: 'Notice',
    progress_pct: notice.status === 'resolved' ? 100 : 0,
    is_notice: true,
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

export default async function AdminWorkHub() {
  await requireRole('admin');

  const todayIso = todayIST();

  const [rawTasks, notices, queries] = await Promise.all([
    listTasks({ limit: 200 }),
    listAllNotices({ status: ['received', 'reply_pending', 'reply_submitted', 'hearing_pending', 'hearing_held', 'order_pending', 'order_received'] }),
    listQueries({ status: ['open', 'in_progress'] }),
  ]);

  const tasks = await enrichTasksWithProgress(rawTasks ?? []);
  const taskItems = (tasks ?? []).map(toWorkItem);
  const noticeItems = (notices ?? []).map(noticeToWorkItem);
  const queryItems = (queries ?? []).map(queryToWorkItem);

  const allWorkItems = [...taskItems, ...noticeItems, ...queryItems];

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
          <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">Work</h1>
          <p className="text-sm text-zinc-500 mt-1">All work across the firm — tasks, notices, and queries.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total work items" value={total} icon={<Briefcase className="h-4 w-4" />} />
        <StatCard label="To do" value={todo} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="In progress" value={inProgress} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Due today" value={dueToday} icon={<AlertTriangle className="h-4 w-4" />} tone="warning" />
      </div>

      {/* Work type filters — navigate to dedicated pages */}
      <div className="flex items-center gap-2 flex-wrap">
        <WorkTypeFilter icon={<Briefcase className="h-3.5 w-3.5" />} label="All" count={total} active href="/admin/work" />
        <WorkTypeFilter icon={<FileText className="h-3.5 w-3.5" />} label="Tasks" count={taskItems.length} href="/admin/tasks" />
        <WorkTypeFilter icon={<Bell className="h-3.5 w-3.5" />} label="Notices" count={noticeItems.length} href="/admin/notices" />
        <WorkTypeFilter icon={<MessageSquare className="h-3.5 w-3.5" />} label="Queries" count={queryItems.length} href="/admin/queries" />
      </div>

      {allWorkItems.length === 0 ? (
        <EmptyState
          title="No work items found"
          body="Create a task or wait for compliance events to generate work."
          icon={<Briefcase className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <TaskBoard tasks={allWorkItems as any} hrefPrefix="/admin/tasks" />
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

function WorkTypeFilter({ icon, label, count, active = false, href }: { icon: React.ReactNode; label: string; count: number; active?: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
        active
          ? 'border-teal-500 bg-teal-50 text-teal-800'
          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
      }`}
    >
      {icon}
      {label}
      <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full">{count}</span>
    </Link>
  );
}
