'use client';

interface ProgressMicroProps {
  progress: number; // 0-100
  completed: number;
  total: number;
}

/** Step progress as a count chip such as "3/5", green once every step is done. */
export function ProgressMicro({ completed, total }: ProgressMicroProps) {
  if (total === 0) return <span className="text-xs text-slate-400">—</span>;
  const done = completed >= total;
  return (
    <span
      className={`tff-pill ${done ? 'tff-pill-good' : completed > 0 ? 'tff-pill-accent' : 'tff-pill-mute'}`}
      title={`${completed} of ${total} steps completed`}
    >
      {completed}/{total}
    </span>
  );
}
