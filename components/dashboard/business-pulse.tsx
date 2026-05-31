'use client';
import { ArrowRight, TrendingUp, Wallet, Banknote } from 'lucide-react';
import Link from 'next/link';

export function BusinessPulse() {
  return (
    <div className="rounded-2xl bg-white p-6 md:p-8" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 tracking-tight">Business Pulse</h2>
          <p className="text-sm text-zinc-500 mt-1">Revenue and collections overview</p>
        </div>
        <Link href="/admin/billing" className="text-sm text-teal-700 hover:underline inline-flex items-center gap-1 font-medium">
          View Details <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2 mb-2 text-zinc-500">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Revenue (MTD)</span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-zinc-900">₹8.40 L</div>
          <div className="text-xs text-teal-600 font-medium mt-1 flex items-center gap-1">
            ↑ 18% <span className="text-zinc-400 font-normal">vs last month</span>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2 mb-2 text-zinc-500">
            <Banknote className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Realization</span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-zinc-900">96.5%</div>
          <div className="text-xs text-teal-600 font-medium mt-1 flex items-center gap-1">
            ↑ 5% <span className="text-zinc-400 font-normal">vs last month</span>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2 mb-2 text-zinc-500">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Collections</span>
          </div>
          <div className="text-2xl font-bold tracking-tight text-zinc-900">₹6.20 L</div>
          <div className="text-xs text-teal-600 font-medium mt-1 flex items-center gap-1">
            ↑ 14% <span className="text-zinc-400 font-normal">vs last month</span>
          </div>
        </div>
      </div>

      <div className="h-48 w-full border-t border-dashed border-zinc-200 pt-6 flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="text-center bg-white/80 backdrop-blur-sm p-4 rounded-xl">
          <div className="text-sm font-semibold text-zinc-900">Chart rendering area</div>
          <div className="text-xs text-zinc-500 mt-1">Area chart tracking daily revenue vs projection</div>
        </div>
      </div>
    </div>
  );
}
