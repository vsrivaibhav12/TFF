'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutList, Columns3 } from 'lucide-react';
import dynamic from 'next/dynamic';

const TaskBoard = dynamic(() => import('./task-board').then((m) => ({ default: m.TaskBoard })), { ssr: false });

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

interface TaskViewWrapperProps {
  tasks: Task[];
  hrefPrefix?: string;
  children: React.ReactNode;
}

export function TaskViewWrapper({ tasks, hrefPrefix, children }: TaskViewWrapperProps) {
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
