'use client';

import { useState, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el) return;
    // Only trigger when at top of scroll
    if (el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta < 0) return;
    const resistance = 2.5;
    const y = Math.min(delta / resistance, 80);
    setTranslateY(y);
  }, [pulling]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);
    if (translateY >= 60) {
      setRefreshing(true);
      setTranslateY(60);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setTranslateY(0);
      }
    } else {
      setTranslateY(0);
    }
  }, [pulling, translateY, onRefresh]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center transition-transform"
        style={{
          top: -60,
          transform: `translateY(${translateY + 60}px)`,
        }}
      >
        {refreshing ? (
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
        ) : (
          <div
            className={cn(
              'h-8 w-8 rounded-full border-2 transition-colors duration-200',
              translateY >= 60 ? 'border-teal-600 bg-teal-50' : 'border-zinc-300'
            )}
          />
        )}
      </div>

      <div
        ref={containerRef}
        className="h-full overflow-auto"
        style={{ transform: `translateY(${translateY}px)`, transition: pulling ? 'none' : 'transform 0.25s ease-out' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
