'use client';

import { useState, useEffect } from 'react';
import { KanbanBoard } from './kanban-board';
import { transitionTaskAction } from '@/lib/actions/tasks';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  is_stuck?: boolean;
  is_verified?: boolean;
  clients?: { business_name: string } | null;
  users_profile?: { full_name: string } | null;
}

interface TaskBoardProps {
  tasks: Task[];
  hrefPrefix?: string;
}

export function TaskBoard({ tasks, hrefPrefix }: TaskBoardProps) {
  const [boardTasks, setBoardTasks] = useState<Task[]>(tasks);

  useEffect(() => {
    setBoardTasks(tasks);
  }, [tasks]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setBoardTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    await transitionTaskAction({ task_id: taskId, to_status: newStatus as import('@/lib/validation/schemas').TaskStatus });
  };

  const handleReorder = async (taskId: string, newIndex: number, columnId: string) => {
    setBoardTasks((prev) => {
      const colTasks = prev.filter((t) => t.status === columnId);
      const task = colTasks.find((t) => t.id === taskId);
      if (!task) return prev;
      const oldIndex = colTasks.findIndex((t) => t.id === taskId);
      if (oldIndex === -1 || oldIndex === newIndex) return prev;
      const reordered = [...colTasks];
      reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, task);
      const others = prev.filter((t) => t.status !== columnId);
      return [...others, ...reordered];
    });
  };

  return (
    <KanbanBoard
      tasks={boardTasks}
      hrefPrefix={hrefPrefix}
      onStatusChange={handleStatusChange}
      onReorder={handleReorder}
    />
  );
}
