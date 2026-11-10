import { Skeleton } from '@/components/ui/skeleton';

export default function TasksLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={`st-${i}`} className="h-[74px] w-full rounded-xl" />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`chip-${i}`} className="h-7 w-24 rounded-full" />
        ))}
      </div>
      <div className="tff-card tff-card-pad space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={`sk-${i}`} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
