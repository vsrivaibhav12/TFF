'use client';
import { useEffect, useState } from 'react';
import { Keyboard } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

const SHORTCUTS = [
  ['⌘/Ctrl + K', 'Open command palette'],
  ['?', 'Show this overlay'],
  ['esc', 'Close overlays / palettes'],
  ['G then D', 'Go to dashboard'],
  ['G then C', 'Go to clients'],
  ['G then T', 'Go to tasks'],
  ['G then Q', 'Go to queries'],
  ['N', 'New (context-sensitive)'],
  ['J / ↓', 'Move down in lists'],
  ['K / ↑', 'Move up in lists'],
  ['⌘/Ctrl + ↵', 'Submit form'],
];

function triggerNewAction(pathname: string) {
  // Try to find and click a "New" button by common data-testid patterns
  const selectors = [
    '[data-testid="new-task-button"]',
    '[data-testid="notice-new"]',
    '[data-testid="cred-new"]',
    '[data-testid="dsc-new"]',
    'button[data-testid^="new-"]',
    'button:has-text("New")',
  ];
  for (const sel of selectors) {
    const btn = document.querySelector<HTMLButtonElement>(sel);
    if (btn) { btn.click(); return true; }
  }
  // Fallback: navigate to known "new" routes
  if (pathname.includes('/tasks') && !pathname.includes('/bulk-create')) {
    window.location.href = pathname.startsWith('/admin') ? '/admin/tasks/bulk-create' : pathname.replace(/\/tasks.*$/, '/tasks');
    return true;
  }
  if (pathname.includes('/clients')) {
    window.location.href = pathname.replace(/\/clients.*$/, '/clients');
    return true;
  }
  return false;
}

export default function ShortcutsHelp({
  role,
  open,
  onClose,
}: {
  role: 'admin' | 'team' | 'client';
  open: boolean;
  onClose: () => void;
}) {
  const [g, setG] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const basePath = role === 'admin' ? '/admin' : role === 'client' ? '/portal' : '/team';

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).matches?.('input, textarea, [contenteditable]')) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        triggerNewAction(pathname ?? window.location.pathname);
      }
      else if (e.key === 'g' || e.key === 'G') setG(true);
      else if (g) {
        if (e.key === 'c') router.push(`${basePath}/clients`);
        else if (e.key === 't') router.push(`${basePath}/tasks`);
        else if (e.key === 'q') router.push(`${basePath}/queries`);
        else if (e.key === 'd') router.push(basePath);
        setG(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g, basePath, role, router, pathname]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm"
      onClick={onClose}
      data-testid="shortcuts-overlay"
    >
      <div
        className="max-w-md w-[90%] rounded-2xl border border-zinc-200/50 bg-white/90 backdrop-blur-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold flex items-center gap-2 tracking-tight">
          <Keyboard className="h-4 w-4 text-teal-600" />
          Keyboard shortcuts
        </h3>
        <div className="mt-4 divide-y divide-zinc-100">
          {SHORTCUTS.map(([k, label]) => (
            <div key={k} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-zinc-700">{label}</span>
              <kbd className="font-mono text-[11px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded border border-zinc-200">
                {k}
              </kbd>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-zinc-400">
          Press <kbd className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-[10px]">?</kbd> anytime to toggle this overlay.
        </div>
      </div>
    </div>
  );
}
