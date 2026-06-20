import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotFoundStateProps {
  title?: string;
  message?: string;
  homeHref: string;
  homeLabel: string;
  variant?: 'root' | 'section' | 'entity';
  icon?: React.ComponentType<{ className?: string }>;
}

export function NotFoundState({
  title,
  message,
  homeHref,
  homeLabel,
  variant = 'section',
  icon: Icon,
}: NotFoundStateProps) {
  const isRoot = variant === 'root';
  const isEntity = variant === 'entity';

  const resolvedTitle = title ?? (isEntity || isRoot ? '404' : 'Page not found');
  const resolvedMessage =
    message ??
    (isEntity
      ? 'Page not found.'
      : isRoot
        ? 'This page could not be found.'
        : 'The page you are looking for does not exist or has been moved.');

  return (
    <div
      className={cn(
        'flex items-center justify-center text-center px-4',
        isRoot && 'min-h-screen',
        !isRoot && !isEntity && 'min-h-[60vh]',
        isEntity && 'max-w-md mx-auto py-24'
      )}
    >
      <div className="space-y-4 max-w-md">
        {Icon && !isRoot && (
          <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto">
            <Icon className="h-8 w-8 text-zinc-400" />
          </div>
        )}
        {!Icon && !isRoot && !isEntity && (
          <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold text-zinc-400">404</span>
          </div>
        )}
        <h1
          className={cn(
            'font-bold text-zinc-900',
            (isRoot || isEntity) && 'text-4xl',
            !isRoot && !isEntity && 'text-2xl'
          )}
        >
          {resolvedTitle}
        </h1>
        <p className="text-zinc-500 text-sm">{resolvedMessage}</p>
        <Button asChild variant="default" className="bg-teal-600 hover:bg-teal-700">
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
      </div>
    </div>
  );
}

export function NotFoundStatePortal({
  title = 'Module restricted or not found',
  message = 'The module you are trying to access has not been enabled for your business profile, or the link is incorrect. Please contact your engagement team if you believe this is an error.',
  homeHref = '/portal',
  homeLabel = 'Return to dashboard',
}: Partial<NotFoundStateProps>) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
      <div className="space-y-4 max-w-md">
        <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto">
          <FileQuestion className="h-8 w-8 text-zinc-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
        <p className="text-zinc-500 text-sm">{message}</p>
        <Button asChild variant="default" className="bg-teal-600 hover:bg-teal-700">
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
