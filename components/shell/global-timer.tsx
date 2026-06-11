'use client';
import { Play, Square, Pause } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'tff-global-timer';

interface TimerState {
  isRunning: boolean;
  seconds: number;
  startedAt: number | null; // epoch ms when timer was last started
}

function readState(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.isRunning && parsed.startedAt) {
        const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000);
        return { isRunning: true, seconds: (parsed.seconds || 0) + elapsed, startedAt: Date.now() };
      }
      return { isRunning: false, seconds: parsed.seconds || 0, startedAt: null };
    }
  } catch { /* ignore */ }
  return { isRunning: false, seconds: 0, startedAt: null };
}

function writeState(state: TimerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function GlobalTimer({ role }: { role: string }) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Restore from localStorage on mount
  useEffect(() => {
    const s = readState();
    setIsRunning(s.isRunning);
    setSeconds(s.seconds);
  }, []);

  // Persist on state changes
  useEffect(() => {
    writeState({ isRunning, seconds, startedAt: isRunning ? Date.now() : null });
  }, [isRunning, seconds]);

  // Tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStart = useCallback(() => setIsRunning(true), []);
  const handlePause = useCallback(() => setIsRunning(false), []);
  const handleStop = useCallback(() => {
    setIsRunning(false);
    setSeconds(0);
    writeState({ isRunning: false, seconds: 0, startedAt: null });
  }, []);

  if (role === 'client') return null;

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-full px-2 py-1 shadow-sm transition-colors hover:bg-white">
      <div className={`text-xs font-mono font-medium px-2 ${isRunning ? 'text-teal-600' : 'text-zinc-500'}`}>
        {formatTime(seconds)}
      </div>
      <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="p-1 rounded-full text-zinc-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            title="Start Timer"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="p-1 rounded-full text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title="Pause Timer"
          >
            <Pause className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={handleStop}
          className="p-1 rounded-full text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Stop & Log Time"
        >
          <Square className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
