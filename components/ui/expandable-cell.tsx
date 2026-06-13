'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableCellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxLines?: number;
}

export function ExpandableCell({ children, className, maxLines = 1, ...props }: ExpandableCellProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const textRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    // Check if the content is overflowing
    const checkTruncation = () => {
      // Temporarily remove line-clamp to get full scroll height
      const previousMaxHeight = el.style.maxHeight;
      const previousWebkitLineClamp = el.style.webkitLineClamp;
      
      // A safe heuristic for 1 line: if scrollWidth > clientWidth
      // For multi-line: if scrollHeight > clientHeight
      let truncated = false;
      if (maxLines === 1) {
        truncated = el.scrollWidth > el.clientWidth;
      } else {
        truncated = el.scrollHeight > el.clientHeight;
      }
      
      setIsTruncated(truncated);
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [children, maxLines, isExpanded]);

  return (
    <div
      className={cn('group relative flex items-start gap-1', className)}
      {...props}
    >
      <div
        ref={textRef}
        className={cn(
          'transition-all duration-200 break-words',
          !isExpanded && maxLines === 1 && 'truncate',
          !isExpanded && maxLines > 1 && `line-clamp-${maxLines}`,
          isExpanded && 'whitespace-normal'
        )}
      >
        {children}
      </div>
      
      {isTruncated && !isExpanded && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(true);
          }}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-zinc-400 hover:text-teal-600 bg-zinc-50 rounded"
          title="Expand"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
      
      {isExpanded && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(false);
          }}
          className="shrink-0 p-0.5 text-zinc-400 hover:text-teal-600 bg-zinc-50 rounded"
          title="Collapse"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
