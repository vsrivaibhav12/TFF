'use client';
import { ArrowRight, TrendingUp, Wallet, Banknote } from 'lucide-react';
import Link from 'next/link';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const data = [
  { name: 'Mon', revenue: 4000, collection: 2400 },
  { name: 'Tue', revenue: 3000, collection: 1398 },
  { name: 'Wed', revenue: 2000, collection: 9800 },
  { name: 'Thu', revenue: 2780, collection: 3908 },
  { name: 'Fri', revenue: 1890, collection: 4800 },
  { name: 'Sat', revenue: 2390, collection: 3800 },
  { name: 'Sun', revenue: 3490, collection: 4300 },
];

export function BusinessPulse() {
  return (
    <div className="tff-card tff-card-pad">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-stone-900 tracking-tight">Business Pulse</h2>
          <p className="text-sm text-stone-500 mt-1">Revenue and collections overview</p>
        </div>
        <Link href="/admin/billing" className="text-sm text-teal-700 hover:underline inline-flex items-center gap-1 font-medium">
          View Details <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2 mb-2 text-stone-500">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Revenue (MTD)</span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-stone-900">₹8.40 L</div>
          <div className="text-xs text-teal-600 font-medium mt-1 flex items-center gap-1">
            ↑ 18% <span className="text-stone-400 font-normal">vs last month</span>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2 mb-2 text-stone-500">
            <Banknote className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Realization</span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-stone-900">96.5%</div>
          <div className="text-xs text-teal-600 font-medium mt-1 flex items-center gap-1">
            ↑ 5% <span className="text-stone-400 font-normal">vs last month</span>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2 mb-2 text-stone-500">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Collections</span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-stone-900">₹6.20 L</div>
          <div className="text-xs text-teal-600 font-medium mt-1 flex items-center gap-1">
            ↑ 14% <span className="text-stone-400 font-normal">vs last month</span>
          </div>
        </div>
      </div>

      <div className="h-[280px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
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
            <Area type="monotone" dataKey="revenue" stroke="#0D9488" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
