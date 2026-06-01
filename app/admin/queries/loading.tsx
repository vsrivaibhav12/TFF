import { Skeleton } from '@/components/ui/skeleton';

export default function QueriesLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="tff-card tff-card-pad space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={`sk-${i}`} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
