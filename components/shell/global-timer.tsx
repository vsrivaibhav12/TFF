'use client';
import { Play, Square, Pause } from 'lucide-react';
import { useState, useEffect } from 'react';

export function GlobalTimer({ role }: { role: string }) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // In a real app, this would sync with DB or localStorage
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  if (role === 'client') return null; // Clients don't use timesheets

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-full px-2 py-1 shadow-sm transition-all hover:bg-white">
      <div className={`text-xs font-mono font-medium px-2 ${isRunning ? 'text-teal-600' : 'text-zinc-500'}`}>
        {formatTime(seconds)}
      </div>
      <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
        {!isRunning ? (
          <button 
            onClick={() => setIsRunning(true)}
            className="p-1 rounded-full text-zinc-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            title="Start Timer"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button 
            onClick={() => setIsRunning(false)}
            className="p-1 rounded-full text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title="Pause Timer"
          >
            <Pause className="h-3.5 w-3.5" />
          </button>
        )}
        <button 
          onClick={() => { setIsRunning(false); setSeconds(0); }}
          className="p-1 rounded-full text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Stop & Log Time"
        >
          <Square className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
