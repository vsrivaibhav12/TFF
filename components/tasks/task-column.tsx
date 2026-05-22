'use client';

import { TaskCard } from './task-card';

interface TaskColumnProps {
  title: string;
  tasks: any[];
  hrefPrefix?: string;
  color?: string;
}

export function TaskColumn({ title, tasks, hrefPrefix, color = '#0D9488' }: TaskColumnProps) {
  return (
    <div className="flex flex-col min-w-[300px] flex-1">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-sm font-semibold text-zinc-700">{title}</h3>
        </div>
        <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2.5 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400 bg-white/50">
            No items
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={`${task.work_item_type ?? 'task'}-${task.id}`} task={task} hrefPrefix={hrefPrefix} />
          ))
        )}
      </div>
    </div>
  );
}
