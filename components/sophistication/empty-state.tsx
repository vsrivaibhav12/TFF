'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  GenericEmptyIllustration,
  ClientsEmptyIllustration,
  TasksEmptyIllustration,
  InboxEmptyIllustration,
  KeyEmptyIllustration,
  ChartEmptyIllustration,
  DocumentEmptyIllustration,
  AllClearEmptyIllustration,
} from '@/components/ui/empty-illustrations';

/** Themed artwork picked by name, so pages do not import individual illustrations. */
export type EmptyStateVariant = 'tasks' | 'clients' | 'inbox' | 'key' | 'chart' | 'document' | 'all-clear' | 'generic';

const VARIANTS: Record<EmptyStateVariant, () => React.ReactElement> = {
  tasks: () => <TasksEmptyIllustration />,
  clients: () => <ClientsEmptyIllustration />,
  inbox: () => <InboxEmptyIllustration />,
  key: () => <KeyEmptyIllustration />,
  chart: () => <ChartEmptyIllustration />,
  document: () => <DocumentEmptyIllustration />,
  'all-clear': () => <AllClearEmptyIllustration />,
  generic: () => <GenericEmptyIllustration />,
};

/**
 * Smart empty state with premium bespoke illustration support.
 * Use the `illustration` prop for themed SVG art, or fallback to `icon`.
 */
export default function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
  actionOnClick,
  icon,
  illustration,
  variant,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
  actionOnClick?: () => void;
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  /** Named themed artwork. Takes precedence over `icon`; an explicit `illustration` wins over both. */
  variant?: EmptyStateVariant;
}) {
  const renderAction = () => {
    if (!actionLabel) return null;
    if (actionHref) {
      return (
        <Link href={actionHref}>
          <Button size="sm" data-testid="empty-action">
            {actionLabel}
          </Button>
        </Link>
      );
    }
    if (actionOnClick) {
      return (
        <Button size="sm" onClick={actionOnClick} data-testid="empty-action">
          {actionLabel}
        </Button>
      );
    }
    return null;
  };

  const themed = variant ? VARIANTS[variant]() : null;
  const art = illustration || themed;
  const visual = art || icon || <GenericEmptyIllustration />;
  const isIllustration = !!art || !icon;

  return (
    <div
      className="rounded-xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-12 text-center"
      data-testid="empty-state"
    >
      <div
        className={`mx-auto mb-5 inline-flex items-center justify-center ${
          isIllustration
            ? 'h-20 w-20 rounded-2xl bg-gradient-to-br from-teal-50 to-slate-50 border border-teal-100/50 animate-float-subtle'
            : 'h-14 w-14 rounded-xl bg-slate-50 border border-slate-200'
        }`}
      >
        {visual}
      </div>
      <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">{body}</p>
      {(actionHref || actionOnClick) && actionLabel && (
        <div className="mt-6">{renderAction()}</div>
      )}
    </div>
  );
}
