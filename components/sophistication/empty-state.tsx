'use client';
import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GenericEmptyIllustration } from '@/components/ui/empty-illustrations';

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
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
  actionOnClick?: () => void;
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
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

  const visual = illustration || icon || <GenericEmptyIllustration />;
  const isIllustration = !!illustration || (!icon && !illustration);

  return (
    <div
      className="rounded-xl border-2 border-dashed border-zinc-200 bg-gradient-to-b from-white to-zinc-50/50 p-12 text-center"
      data-testid="empty-state"
    >
      <div
        className={`mx-auto mb-5 inline-flex items-center justify-center ${
          isIllustration
            ? 'h-20 w-20 rounded-2xl bg-gradient-to-br from-teal-50 to-zinc-50 border border-teal-100/50 animate-float-subtle'
            : 'h-14 w-14 rounded-xl bg-zinc-50 border border-zinc-200'
        }`}
      >
        {visual}
      </div>
      <h3 className="text-base font-semibold text-zinc-900 tracking-tight">{title}</h3>
      <p className="text-sm text-zinc-500 mt-2 max-w-sm mx-auto leading-relaxed">{body}</p>
      {(actionHref || actionOnClick) && actionLabel && (
        <div className="mt-6">{renderAction()}</div>
      )}
    </div>
  );
}
