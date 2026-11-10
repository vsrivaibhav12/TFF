'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Props } from './detail/types';
import { useTaskDetail } from './detail/use-task-detail';
import TaskDetailModalLayout from './detail/modal-layout';
import TaskDetailFullLayout from './detail/full-layout';

/**
 * Task detail view. State and handlers live in `detail/use-task-detail`; the dock (modal)
 * and full-page layouts are separate components in `detail/`.
 */
export default function TaskDetailShell(props: Props) {
  const ctx = useTaskDetail(props);
  const { ConfirmDialog, isModal, basePath } = ctx;
  return (
    <div className={`flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 ${isModal ? 'h-full' : 'h-[calc(100vh-6.5rem)]'}`}>
      <ConfirmDialog />
      {!isModal && (
        <div className="flex-none mb-4 md:hidden">
          <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 font-medium">
            <ChevronLeft className="h-4 w-4" /> Back to Tasks
          </Link>
        </div>
      )}


      {isModal ? <TaskDetailModalLayout ctx={ctx} /> : <TaskDetailFullLayout ctx={ctx} />}
    </div>
  );
}
