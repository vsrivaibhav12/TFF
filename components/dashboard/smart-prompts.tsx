'use client';
import { AlertCircle, IndianRupee, Hand } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function AdminPayrollPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show payroll prompt if it's the last 3 days of the month or first 5 days
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const day = today.getDate();
    
    if (day >= lastDayOfMonth - 3 || day <= 5) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50 p-4 shadow-sm">
      <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-teal-100 text-teal-700 shrink-0">
          <IndianRupee className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-teal-900">Time to run payroll</h3>
          <p className="text-sm text-teal-700 mt-0.5">
            It is the end of the month. Don't forget to run payroll for the team.
          </p>
        </div>
        <Link
          href="/admin/payroll"
          className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Run Payroll
        </Link>
      </div>
    </div>
  );
}

export function TeamAttendancePrompt() {
  // In a real app, this checks if attendance is logged for today
  // For the sake of the UX mockup, we show it
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-100 text-amber-700 shrink-0">
          <Hand className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">Punch In</h3>
          <p className="text-sm text-amber-700 mt-0.5">
            You haven't marked your attendance today. Please punch in to start your day.
          </p>
        </div>
        <Link
          href="/team/attendance"
          onClick={() => setShow(false)}
          className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Punch In Now
        </Link>
      </div>
    </div>
  );
}
