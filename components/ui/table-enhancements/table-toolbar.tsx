'use client';

import { useState, useRef, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { orderColumns } from '@/lib/services/saved-views';
import { Columns, Maximize2, Minimize2, Check, GripVertical } from 'lucide-react';

export type TableDensity = 'compact' | 'comfortable';

export interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  optional?: boolean; // If false, column cannot be hidden
}

interface TableToolbarProps {
  columns: ColumnDef[];
  onColumnsChange: (cols: ColumnDef[]) => void;
  density: TableDensity;
  onDensityChange: (d: TableDensity) => void;
  /** Puts the columns, their order and the density back to the page default. */
  onReset?: () => void;
  className?: string;
}

// The checkbox and actions columns stay at the ends; everything else can be moved and, if optional, hidden.
const PINNED = new Set(['select', 'actions']);

function ColumnRow({ col, onToggle }: { col: ColumnDef; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex items-center gap-1 px-2 py-1 text-sm', isDragging && 'relative z-10 rounded-lg bg-white shadow-card-hover')}
    >
      <button
        type="button"
        className="flex h-7 w-6 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:text-slate-700 active:cursor-grabbing"
        aria-label={`Move ${col.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onToggle}
        disabled={col.optional === false}
        className={cn('flex flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-slate-50', col.optional === false && 'cursor-default')}
      >
        <span className="flex h-4 w-4 items-center justify-center">
          {col.visible ? <Check className="h-3.5 w-3.5 text-teal-600" /> : <span className="h-3.5 w-3.5 rounded border border-slate-300" />}
        </span>
        <span className="flex-1">{col.label}</span>
        {col.optional === false && <span className="text-[11px] text-slate-400">Always on</span>}
      </button>
    </div>
  );
}

export function TableToolbar({ columns, onColumnsChange, density, onDensityChange, onReset, className }: TableToolbarProps) {
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setColMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const movable = columns.filter((c) => !PINNED.has(c.key));
  const visibleCount = columns.filter((c) => c.visible && !PINNED.has(c.key)).length;

  const toggleColumn = (key: string) => onColumnsChange(columns.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const keys = movable.map((c) => c.key);
    const next = arrayMove(keys, keys.indexOf(String(active.id)), keys.indexOf(String(over.id)));
    onColumnsChange(orderColumns(columns, next));
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
        onClick={() => onDensityChange(density === 'compact' ? 'comfortable' : 'compact')}
        title={density === 'compact' ? 'Switch to comfortable' : 'Switch to compact'}
      >
        {density === 'compact' ? (
          <>
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Compact</span>
          </>
        ) : (
          <>
            <Minimize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Comfortable</span>
          </>
        )}
      </Button>

      <div className="relative" ref={menuRef}>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg px-2.5 text-xs" onClick={() => setColMenuOpen((v) => !v)} aria-expanded={colMenuOpen}>
          <Columns className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Columns</span>
          <span className="text-xs tabular-nums text-slate-500">{visibleCount}/{movable.length}</span>
        </Button>

        {colMenuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-[#E8EAEE] bg-white py-1 shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="tff-eyebrow">Columns</span>
              <span className="text-xs text-slate-400">Drag to reorder</span>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={movable.map((c) => c.key)} strategy={verticalListSortingStrategy}>
                <div className="max-h-[60vh] overflow-y-auto">
                  {movable.map((col) => (
                    <ColumnRow key={col.key} col={col} onToggle={() => toggleColumn(col.key)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="border-t border-[#E8EAEE] px-3 py-1.5">
              <button
                type="button"
                onClick={() => (onReset ? onReset() : onColumnsChange(columns.map((c) => ({ ...c, visible: true }))))}
                className="text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                Reset to default
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
