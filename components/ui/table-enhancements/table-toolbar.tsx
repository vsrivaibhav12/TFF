'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Settings2,
  Columns,
  Maximize2,
  Minimize2,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

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
  className?: string;
}

export function TableToolbar({
  columns,
  onColumnsChange,
  density,
  onDensityChange,
  className,
}: TableToolbarProps) {
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setColMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggleColumn = (key: string) => {
    onColumnsChange(
      columns.map((c) =>
        c.key === key ? { ...c, visible: !c.visible } : c
      )
    );
  };

  const visibleCount = columns.filter((c) => c.visible).length;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Density toggle */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2.5 text-xs rounded-lg gap-1.5"
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

      {/* Column toggle */}
      <div className="relative" ref={menuRef}>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs rounded-lg gap-1.5"
          onClick={() => setColMenuOpen((v) => !v)}
        >
          <Columns className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Columns</span>
          <span className="text-[10px] text-zinc-400 tabular-nums">
            {visibleCount}/{columns.length}
          </span>
        </Button>

        {colMenuOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-zinc-200 bg-white shadow-lg z-50 py-1">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Visible columns
            </div>
            {columns.map((col) => (
              <button
                key={col.key}
                onClick={() => {
                  if (!col.optional) return;
                  toggleColumn(col.key);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                  col.optional
                    ? 'hover:bg-zinc-50 cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                )}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  {col.visible ? (
                    <Check className="h-3.5 w-3.5 text-teal-600" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded border border-zinc-300" />
                  )}
                </span>
                <span className="flex-1">{col.label}</span>
                {col.optional === false && (
                  <Eye className="h-3 w-3 text-zinc-300" />
                )}
              </button>
            ))}
            <div className="border-t border-zinc-100 px-3 py-1.5">
              <button
                onClick={() => {
                  onColumnsChange(
                    columns.map((c) => ({ ...c, visible: true }))
                  );
                }}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
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
