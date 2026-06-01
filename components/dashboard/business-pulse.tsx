'use client';
import { Clock, CheckSquare, TrendingUp } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function FirmPulse({
  workDone,
  completedTasks,
}: {
  workDone: { work_date: string; duration_minutes: number }[];
  completedTasks: { completed_at: string | null }[];
}) {
  // Aggregate data by the last 7 days
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const chartData = days.map((dayStr) => {
    const dateObj = new Date(dayStr);
    const dayName = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(dateObj);
    
    const minutes = workDone
      .filter((w) => w.work_date.startsWith(dayStr))
      .reduce((sum, w) => sum + w.duration_minutes, 0);
    const hours = Number((minutes / 60).toFixed(1));

    const tasks = completedTasks
      .filter((t) => t.completed_at?.startsWith(dayStr))
      .length;

    return {
      name: dayName,
      fullDate: dayStr,
      Hours: hours,
      Tasks: tasks,
    };
  });

  const totalHours = chartData.reduce((sum, d) => sum + d.Hours, 0);
  const totalTasks = chartData.reduce((sum, d) => sum + d.Tasks, 0);

  return (
    <div className="tff-card tff-card-pad">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-stone-900 tracking-tight">Firm Pulse</h2>
          <p className="text-sm text-stone-500 mt-1">Work output over the last 7 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2 mb-2 text-stone-500">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Time Tracked (7d)</span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-stone-900">{totalHours.toFixed(1)}h</div>
        </div>
        <div className="p-4 rounded-xl border border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2 mb-2 text-stone-500">
            <CheckSquare className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Tasks Completed (7d)</span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-stone-900">{totalTasks}</div>
        </div>
      </div>

      <div className="h-[280px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} 
              itemStyle={{ color: '#1c1917', fontSize: '14px', fontWeight: 600 }}
              labelStyle={{ color: '#78716c', fontSize: '12px', marginBottom: '4px' }}
            />
            <Area type="monotone" dataKey="Hours" stroke="#0D9488" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
