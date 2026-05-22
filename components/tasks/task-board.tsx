'use client';

import { TaskColumn } from './task-column';

interface TaskBoardProps {
  tasks: any[];
  hrefPrefix?: string;
}

export function TaskBoard({ tasks, hrefPrefix = '/admin/tasks' }: TaskBoardProps) {
  const todo = tasks.filter((t) => t.status === 'pending' && !t.is_blocked_on_client && !t.is_stuck);
  const inProgress = tasks.filter((t) => t.status === 'in_progress' && !t.is_blocked_on_client && !t.is_stuck);
  const pendingReview = tasks.filter((t) => t.is_blocked_on_client || t.is_stuck || t.status === 'review' || t.status === 'awaiting_client');

  return (
    <div className="flex gap-5 overflow-x-auto pb-4">
      <TaskColumn title="To do" tasks={todo} hrefPrefix={hrefPrefix} color="#71717A" />
      <TaskColumn title="In progress" tasks={inProgress} hrefPrefix={hrefPrefix} color="#0D9488" />
      <TaskColumn title="Pending review" tasks={pendingReview} hrefPrefix={hrefPrefix} color="#F59E0B" />
    </div>
  );
}
