export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-stone-200 rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
}

export function ApartmentDetailSkeleton() {
  return (
    <div className="pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl overflow-hidden mb-10">
          <Skeleton className="aspect-[4/3] sm:row-span-2 sm:aspect-auto sm:h-full rounded-none" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="aspect-[4/3] rounded-none" />
            <Skeleton className="aspect-[4/3] rounded-none" />
            <Skeleton className="aspect-[4/3] rounded-none" />
            <Skeleton className="aspect-[4/3] rounded-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
          <div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookingFlowSkeleton() {
  return (
    <div className="pt-28 pb-24 min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12 max-w-3xl mx-auto">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="flex-1 h-px mx-4" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="flex-1 h-px mx-4" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>

        <Skeleton className="h-10 w-64 mx-auto mb-3" />
        <Skeleton className="h-5 w-96 mx-auto mb-10" />

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
