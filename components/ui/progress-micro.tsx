'use client';

interface ProgressMicroProps {
  progress: number; // 0-100
  completed: number;
  total: number;
}

export function ProgressMicro({ progress, completed, total }: ProgressMicroProps) {
  if (total === 0) return <span className="text-[11px] text-zinc-400">—</span>;

  const color = progress >= 80 ? 'bg-teal-500' : progress >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2" title={`${completed} of ${total} steps completed`}>
      <div className="h-1.5 w-10 bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-[width] duration-500`} style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[10px] font-medium text-zinc-500 tabular-nums">{progress}%</span>
    </div>
  );
}
