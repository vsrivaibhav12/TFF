'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export function QuickActionsDropdown({ role }: { role: string }) {
  const [open, setOpen] = useState(false);

  const adminLinks = [
    { label: 'New task', href: '/admin/tasks' },
    { label: 'New client', href: '/admin/clients' },
    { label: 'Log work done', href: '/admin/work-done' },
    { label: 'Bulk create tasks', href: '/admin/tasks/bulk-create' },
  ];

  const teamLinks = [
    { label: 'Go to tasks', href: '/team/tasks' },
    { label: 'Log work done', href: '/team/work-done' },
    { label: 'Request leave', href: '/team/leave' },
    { label: 'Mark attendance', href: '/team/attendance' },
  ];

  const links = role === 'admin' ? adminLinks : role === 'team' ? teamLinks : [];

  if (links.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center h-8 w-8 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
        title="Quick actions"
        aria-label="Quick actions"
        aria-expanded={open}
      >
        <Plus className="h-4 w-4" />
      </button>
      
      {open && (
        <>
          <div
            role="button"
            tabIndex={-1}
            aria-label="Close quick actions"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); } }}
          />
          <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-floating z-50 py-1 overflow-hidden">
            <div className="px-3 py-2 text-xs font-medium text-slate-500 border-b border-slate-100">
              Quick actions
            </div>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
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
