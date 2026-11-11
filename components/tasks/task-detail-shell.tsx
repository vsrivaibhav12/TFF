'use client';

import type { Props } from './detail/types';
import { useTaskDetail } from './detail/use-task-detail';
import TaskDetailModalLayout from './detail/modal-layout';

/**
 * Task detail view, shown in the detail dock. State and handlers live in `detail/use-task-detail`;
 * the layout is `detail/modal-layout`.
 */
export default function TaskDetailShell(props: Props) {
  const ctx = useTaskDetail(props);
  const { ConfirmDialog } = ctx;
  return (
    <div className="flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 h-full">
      <ConfirmDialog />
      <TaskDetailModalLayout ctx={ctx} />
    </div>
  );
}
