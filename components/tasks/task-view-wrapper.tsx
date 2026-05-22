'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutList, Columns3 } from 'lucide-react';
import { TaskBoard } from './task-board';

interface TaskViewWrapperProps {
  tasks: any[];
  hrefPrefix?: string;
  children: React.ReactNode;
}

export function TaskViewWrapper({ tasks, hrefPrefix = '/admin/tasks', children }: TaskViewWrapperProps) {
  const [view, setView] = useState<'list' | 'board'>('list');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <div className="flex items-center bg-zinc-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              view === 'list' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            )}
            aria-pressed={view === 'list'}
          >
            <LayoutList className="h-3.5 w-3.5" />
            List
          </button>
          <button
            onClick={() => setView('board')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              view === 'board' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            )}
            aria-pressed={view === 'board'}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Board
          </button>
        </div>
      </div>

      {view === 'list' ? children : <TaskBoard tasks={tasks} hrefPrefix={hrefPrefix} />}
    </div>
  );
}
