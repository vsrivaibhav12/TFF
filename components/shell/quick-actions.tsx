'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export function QuickActionsDropdown({ role }: { role: string }) {
  const [open, setOpen] = useState(false);

  const adminLinks = [
    { label: 'New Task', href: '/admin/tasks/bulk-create' },
    { label: 'Add Client', href: '/admin/clients/new' },
    { label: 'Run Payroll', href: '/admin/payroll' },
    { label: 'Add Team Member', href: '/admin/team' },
  ];

  const teamLinks = [
    { label: 'Create Task', href: '/team/tasks' },
    { label: 'Log Work Done', href: '/team/work-done' },
    { label: 'Request Leave', href: '/team/leave' },
    { label: 'Mark Attendance', href: '/team/attendance' },
  ];

  const links = role === 'admin' ? adminLinks : role === 'team' ? teamLinks : [];

  if (links.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center h-8 w-8 rounded-full bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm"
        title="Quick Actions"
      >
        <Plus className="h-4 w-4" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-zinc-200 bg-white shadow-lg z-50 py-1 overflow-hidden">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-zinc-500 bg-zinc-50/50 border-b border-zinc-100">
              Quick Create
            </div>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
