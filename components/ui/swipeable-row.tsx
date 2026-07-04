'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SwipeAction {
  label: string;
  icon?: React.ReactNode;
  color?: string;
  onClick: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  className?: string;
}

export function SwipeableRow({ children, leftActions, rightActions, className }: SwipeableRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxLeft = leftActions ? leftActions.length * 72 : 0;
  const maxRight = rightActions ? -(rightActions.length * 72) : 0;

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startX.current = clientX;
    currentX.current = translateX;
    setIsDragging(true);
  }, [translateX]);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const delta = clientX - startX.current;
    let x = currentX.current + delta;
    x = Math.max(maxRight, Math.min(maxLeft, x));
    setTranslateX(x);
  }, [isDragging, maxLeft, maxRight]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    // Snap to nearest action or close
    if (translateX > 30) {
      setTranslateX(maxLeft > 0 ? 72 : 0);
    } else if (translateX < -30) {
      setTranslateX(maxRight < 0 ? -72 : 0);
    } else {
      setTranslateX(0);
    }
  }, [isDragging, translateX, maxLeft, maxRight]);

  return (
    <div className={cn('relative overflow-hidden', className)} ref={containerRef}>
      {/* Background actions layer */}
      <div className="absolute inset-0 flex justify-between items-stretch">
        {leftActions && leftActions.length > 0 && (
          <div className="flex items-stretch">
            {leftActions.map((action, i) => (
              <button
                key={action.label}
                onClick={() => { action.onClick(); setTranslateX(0); }}
                className="flex items-center justify-center w-[72px] text-white text-xs font-medium"
                style={{ backgroundColor: action.color ?? '#0D9488' }}
              >
                <div className="flex flex-col items-center gap-1">
                  {action.icon && <span>{action.icon}</span>}
                  <span>{action.label}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {rightActions && rightActions.length > 0 && (
          <div className="flex items-stretch">
            {rightActions.map((action, i) => (
              <button
                key={action.label}
                onClick={() => { action.onClick(); setTranslateX(0); }}
                className="flex items-center justify-center w-[72px] text-white text-xs font-medium"
                style={{ backgroundColor: action.color ?? '#DC2626' }}
              >
                <div className="flex flex-col items-center gap-1">
                  {action.icon && <span>{action.icon}</span>}
                  <span>{action.label}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Foreground content */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Swipeable row"
        className="relative bg-white"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
