import { Skeleton } from '@/components/ui/Skeleton';

export default function CarsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading cars">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="mt-3 h-5 w-52" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Skeleton className="hidden h-[560px] rounded-2xl lg:block" />
        <div className="space-y-4">
          <Skeleton className="h-11 w-full" />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-6 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
