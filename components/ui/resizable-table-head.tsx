'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ResizableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  width?: number;
  onResize?: (width: number) => void;
}

export const ResizableTableHead = React.forwardRef<HTMLTableCellElement, ResizableTableHeadProps>(
  ({ className, width, onResize, children, style, ...props }, ref) => {
    const [resizing, setResizing] = React.useState(false);
    const startXRef = React.useRef(0);
    const startWidthRef = React.useRef(0);

    function startResize(e: React.MouseEvent) {
      if (!onResize) return;
      e.preventDefault();
      e.stopPropagation();
      setResizing(true);
      startXRef.current = e.clientX;
      const cell = (e.currentTarget as HTMLElement).parentElement as HTMLTableCellElement;
      startWidthRef.current = cell?.offsetWidth ?? width ?? 150;

      function onMouseMove(ev: MouseEvent) {
        const delta = ev.clientX - startXRef.current;
        onResize?.(Math.max(60, startWidthRef.current + delta));
      }

      function onMouseUp() {
        setResizing(false);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return (
      <th
        ref={ref}
        style={{ ...style, width: width ? `${width}px` : undefined, minWidth: width ? `${width}px` : undefined }}
        className={cn(
          'h-12 px-4 text-left align-middle font-semibold text-zinc-500 text-xs uppercase tracking-wider relative',
          resizing && 'select-none',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <span className="truncate">{children}</span>
          {onResize && (
            <span
              onMouseDown={startResize}
              className={cn(
                'absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-20 flex items-center justify-end pr-0.5',
                'hover:bg-teal-600/10',
                resizing && 'bg-teal-600/20'
              )}
              title="Drag to resize"
            >
              <span className="h-4 w-px bg-zinc-300" />
            </span>
          )}
        </div>
      </th>
    );
  }
);
ResizableTableHead.displayName = 'ResizableTableHead';
