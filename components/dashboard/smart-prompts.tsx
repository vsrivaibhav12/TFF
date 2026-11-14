'use client';
import { Hand } from 'lucide-react';
import Link from 'next/link';

export function TeamAttendancePrompt({ hasAttendance }: { hasAttendance: boolean }) {
  if (hasAttendance) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-100 text-amber-700 shrink-0">
          <Hand className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">Punch In</h3>
          <p className="text-sm text-amber-700 mt-0.5">
            You haven&apos;t marked your attendance today. Please punch in to start your day.
          </p>
        </div>
        <Link
          href="/team/attendance"
          className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Punch In Now
        </Link>
      </div>
    </div>
  );
}
