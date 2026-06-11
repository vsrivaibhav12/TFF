'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './task-card';

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

interface ColumnDef {
  id: string;
  title: string;
  color: string;
}

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
  onReorder?: (taskId: string, newIndex: number, columnId: string) => Promise<void>;
  hrefPrefix?: string;
}

const COLUMNS = [
  { id: 'pending', title: 'To Do', color: '#71717A' },
  { id: 'in_progress', title: 'In Progress', color: '#0D9488' },
  { id: 'awaiting_client', title: 'Awaiting client', color: '#F59E0B' },
  { id: 'review', title: 'Review', color: '#8B5CF6' },
  { id: 'completed', title: 'Completed', color: '#16A34A' },
];

export function KanbanBoard({ tasks, onStatusChange, onReorder, hrefPrefix }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [orderedTasks, setOrderedTasks] = useState<Task[]>(tasks);

  useEffect(() => {
    setOrderedTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = orderedTasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = orderedTasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    let targetStatus = activeTask.status;
    if (COLUMNS.some((c) => c.id === overId)) {
      // Dropped on a column
      targetStatus = overId;
    } else {
      // Dropped on another task
      const overTask = orderedTasks.find((t) => t.id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (activeTask.status !== targetStatus) {
      // Cross-column: update local state optimistically
      setOrderedTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus } : t))
      );
      onStatusChange(activeId, targetStatus);
      return;
    }

    // Within-column reorder
    if (activeId !== overId) {
      const colTasks = orderedTasks.filter((t) => t.status === targetStatus);
      const oldIndex = colTasks.findIndex((t) => t.id === activeId);
      const newIndex = colTasks.findIndex((t) => t.id === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedCol = arrayMove(colTasks, oldIndex, newIndex);
        setOrderedTasks((prev) => {
          const others = prev.filter((t) => t.status !== targetStatus);
          return [...others, ...reorderedCol];
        });
        onReorder?.(activeId, newIndex, targetStatus);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-5 overflow-x-auto pb-4 pt-2">
        {COLUMNS.map((col) => {
          const colTasks = orderedTasks.filter((t) => t.status === col.id);
          return (
            <KanbanColumn key={col.id} column={col} tasks={colTasks} hrefPrefix={hrefPrefix} />
          );
        })}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90 transform scale-105">
            <TaskCard task={activeTask} hrefPrefix={hrefPrefix} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({ column, tasks, hrefPrefix }: { column: ColumnDef; tasks: Task[]; hrefPrefix?: string }) {
  return (
    <div className="flex flex-col min-w-[320px] max-w-[320px] flex-shrink-0 bg-zinc-50/50 rounded-xl p-3 border border-zinc-100">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} />
          <h3 className="text-sm font-semibold text-zinc-700">{column.title}</h3>
        </div>
        <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2.5 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      
      <SortableContext id={column.id} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3 min-h-[150px]">
          {tasks.map((task) => (
            <SortableTask key={task.id} task={task} hrefPrefix={hrefPrefix} />
          ))}
          {tasks.length === 0 && (
            <div className="h-full flex-1 rounded-xl border-2 border-dashed border-zinc-200 p-6 flex flex-col items-center justify-center text-zinc-400 text-xs">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTask({ task, hrefPrefix }: { task: Task; hrefPrefix?: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: task });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} hrefPrefix={hrefPrefix} />
    </div>
  );
}
