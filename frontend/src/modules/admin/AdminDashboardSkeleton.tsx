export function AdminDashboardSkeleton() {
  return (
    <div className="flex w-full gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="h-7 w-40 animate-pulse rounded bg-slate-800/70" />
          <div className="h-8 w-48 animate-pulse rounded-full bg-slate-800/70" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-full bg-slate-900/80" />
        <div className="h-80 w-full animate-pulse rounded-2xl bg-slate-900/80" />
      </div>
      <div className="w-[320px] shrink-0 space-y-3">
        <div className="h-7 w-32 animate-pulse rounded bg-slate-800/70" />
        <div className="h-40 w-full animate-pulse rounded-2xl bg-slate-900/80" />
        <div className="h-40 w-full animate-pulse rounded-2xl bg-slate-900/80" />
      </div>
    </div>
  );
}

