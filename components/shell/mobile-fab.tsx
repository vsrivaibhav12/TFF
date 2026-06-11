'use client';

import { useState } from 'react';
import { Plus, X, Briefcase, Users, MessageSquare, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/ui/bottom-sheet';

interface FabAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  testId?: string;
}

interface MobileFabProps {
  actions?: FabAction[];
}

export function MobileFab({ actions }: MobileFabProps) {
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Default actions based on current page if none provided
  const defaultActions: FabAction[] = [];
  if (!actions && pathname) {
    if (pathname.includes('/tasks')) {
      defaultActions.push({
        label: 'New task',
        icon: <Briefcase className="h-4 w-4" />,
        onClick: () => {
          const btn = document.querySelector<HTMLButtonElement>('[data-testid="new-task-button"]');
          btn?.click();
        },
        testId: 'fab-new-task',
      });
    }
    if (pathname.includes('/clients')) {
      defaultActions.push({
        label: 'New client',
        icon: <Users className="h-4 w-4" />,
        onClick: () => setSheetOpen(true),
        testId: 'fab-new-client',
      });
    }
    if (pathname.includes('/queries')) {
      defaultActions.push({
        label: 'New query',
        icon: <MessageSquare className="h-4 w-4" />,
        onClick: () => setSheetOpen(true),
        testId: 'fab-new-query',
      });
    }
    if (pathname.includes('/notices')) {
      defaultActions.push({
        label: 'New notice',
        icon: <ScrollText className="h-4 w-4" />,
        onClick: () => setSheetOpen(true),
        testId: 'fab-new-notice',
      });
    }
  }

  const fabActions = actions ?? defaultActions;
  if (fabActions.length === 0) return null;

  // Single action: just show the button
  if (fabActions.length === 1) {
    const [action] = fabActions;
    return (
      <>
        <button
          onClick={action.onClick}
          data-testid={action.testId}
          className="md:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-teal-600 text-white shadow-lg flex items-center justify-center hover:bg-teal-700 active:scale-95 transition-colors transition-transform"
          aria-label={action.label}
        >
          <Plus className="h-6 w-6" />
        </button>
        <MobileCreateSheet open={sheetOpen} onClose={() => setSheetOpen(false)} pathname={pathname} router={router} />
      </>
    );
  }

  // Multiple actions: expandable menu
  return (
    <>
      <div className="md:hidden fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3">
        {open && (
          <div className="flex flex-col items-end gap-2 mb-1 animate-in slide-in-from-bottom-2 fade-in duration-200">
            {fabActions.map((action, i) => (
              <button
                key={action.label}
                onClick={() => { action.onClick(); setOpen(false); }}
                data-testid={action.testId}
                className="flex items-center gap-2 pr-2"
              >
                <span className="text-xs font-medium text-zinc-700 bg-white px-2 py-1 rounded-md shadow-sm border border-zinc-200">
                  {action.label}
                </span>
                <span className="h-10 w-10 rounded-full bg-white text-zinc-700 shadow-md border border-zinc-200 flex items-center justify-center">
                  {action.icon}
                </span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-colors transition-transform active:scale-95',
            open ? 'bg-zinc-800 text-white rotate-45' : 'bg-teal-600 text-white hover:bg-teal-700'
          )}
          aria-label={open ? 'Close menu' : 'Create new'}
          aria-expanded={open}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
      <MobileCreateSheet open={sheetOpen} onClose={() => setSheetOpen(false)} pathname={pathname} router={router} />
    </>
  );
}

function MobileCreateSheet({ open, onClose, pathname, router }: { open: boolean; onClose: () => void; pathname: string | null; router: ReturnType<typeof useRouter> }) {
  const rolePrefix = pathname?.startsWith('/admin') ? '/admin' : pathname?.startsWith('/team') ? '/team' : '/admin';
  return (
    <BottomSheet open={open} onClose={onClose} title="Quick create">
      <div className="space-y-2">
        {pathname?.includes('/clients') && (
          <button
            onClick={() => { router.push(`${rolePrefix}/clients`); onClose(); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors text-left"
          >
            <span className="h-10 w-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <div className="font-medium text-zinc-900">New client</div>
              <div className="text-xs text-zinc-500">Add a client to the portal</div>
            </div>
          </button>
        )}
        {pathname?.includes('/queries') && (
          <button
            onClick={() => { onClose(); setTimeout(() => document.querySelector<HTMLButtonElement>('[data-testid="new-query-btn"]')?.click(), 0); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors text-left"
          >
            <span className="h-10 w-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div>
              <div className="font-medium text-zinc-900">New query</div>
              <div className="text-xs text-zinc-500">Raise a question to your team</div>
            </div>
          </button>
        )}
        {pathname?.includes('/notices') && (
          <button
            onClick={() => { onClose(); setTimeout(() => document.querySelector<HTMLButtonElement>('[data-testid="notice-new"]')?.click(), 0); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors text-left"
          >
            <span className="h-10 w-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
              <ScrollText className="h-5 w-5" />
            </span>
            <div>
              <div className="font-medium text-zinc-900">New notice</div>
              <div className="text-xs text-zinc-500">Track a new government notice</div>
            </div>
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
