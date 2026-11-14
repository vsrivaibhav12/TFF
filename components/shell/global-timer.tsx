'use client';
import { Play, Square, Pause } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useDockState } from '@/lib/state/dock-state';
import { addManualWorkDoneAction } from '@/lib/actions/work-done';
import { todayIST } from '@/lib/utils';

const STORAGE_KEY = 'tff-global-timer';

interface TimerState {
  isRunning: boolean;
  seconds: number;
  startedAt: number | null; // epoch ms when timer was last started
  taskId?: string | null; // task the timer was started on, if any
}

function readState(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.isRunning && parsed.startedAt) {
        const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000);
        return { isRunning: true, seconds: (parsed.seconds || 0) + elapsed, startedAt: Date.now(), taskId: parsed.taskId ?? null };
      }
      return { isRunning: false, seconds: parsed.seconds || 0, startedAt: null, taskId: parsed.taskId ?? null };
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
  const [taskId, setTaskId] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);
  const pathname = usePathname();
  const dock = useDockState();

  // The task the user is looking at right now: the top dock panel, else a /tasks/<id> page.
  const topDock = dock[dock.length - 1];
  const contextTaskId =
    topDock?.type === 'task'
      ? topDock.id
      : pathname.match(/\/tasks\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f-]{22})/i)?.[1] ?? null;

  // Restore from localStorage on mount
  useEffect(() => {
    const s = readState();
    setIsRunning(s.isRunning);
    setSeconds(s.seconds);
    setTaskId(s.taskId ?? null);
  }, []);

  // Persist on state changes
  useEffect(() => {
    writeState({ isRunning, seconds, startedAt: isRunning ? Date.now() : null, taskId });
  }, [isRunning, seconds, taskId]);

  // Tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStart = useCallback(() => {
    // Remember which task the timer was started on so Stop can log against it.
    setTaskId((prev) => prev ?? contextTaskId);
    setIsRunning(true);
  }, [contextTaskId]);
  const handlePause = useCallback(() => setIsRunning(false), []);
  const handleStop = useCallback(async () => {
    setIsRunning(false);
    const elapsed = seconds;
    const target = taskId ?? contextTaskId;
    const reset = () => {
      setSeconds(0);
      setTaskId(null);
      writeState({ isRunning: false, seconds: 0, startedAt: null, taskId: null });
    };

    if (elapsed < 60) {
      reset();
      return;
    }
    if (!target) {
      toast.info('Timer cleared. Start it on a task to log time to work done automatically.');
      reset();
      return;
    }

    setLogging(true);
    const minutes = Math.min(1440, Math.max(1, Math.ceil(elapsed / 60)));
    const res = await addManualWorkDoneAction({
      task_id: target,
      work_date: todayIST(),
      duration_minutes: minutes,
      note: 'Logged with timer',
      started_at: new Date(Date.now() - elapsed * 1000).toISOString(),
      ended_at: new Date().toISOString(),
    });
    setLogging(false);
    if (res.success) {
      toast.success(`Logged ${minutes} min to work done`);
      reset();
    } else {
      // Keep the elapsed time so nothing is lost; the user can retry or log manually.
      toast.error(res.error ?? 'Could not log time');
    }
  }, [seconds, taskId, contextTaskId]);


  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Idle and empty: a single play button. The full readout appears once there is time to show.
  if (!isRunning && seconds === 0) {
    return (
      <button
        onClick={handleStart}
        className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition-colors"
        title="Start timer"
        aria-label="Start timer"
      >
        <Play className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-2 py-1 transition-colors hover:bg-white">
      <div className={`text-xs font-mono font-medium px-2 tabular-nums ${isRunning ? 'text-teal-700' : 'text-slate-500'}`}>
        {formatTime(seconds)}
      </div>
      <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="p-1 rounded-full text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            title="Start timer"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="p-1 rounded-full text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title="Pause timer"
          >
            <Pause className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={handleStop}
          className="p-1 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Stop and log time"
          aria-label="Stop and log time"
          disabled={logging}
        >
          <Square className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
