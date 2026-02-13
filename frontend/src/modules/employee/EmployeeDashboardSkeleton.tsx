export function EmployeeDashboardSkeleton() {
  return (
    <div className="flex w-full gap-6">
      <div className="flex flex-1 flex-col gap-4">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-800/70" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-900/80" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-900/80" />
      </div>
      <div className="flex w-[360px] flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-slate-800/70" />
          <div className="h-8 w-24 animate-pulse rounded-full bg-slate-800/70" />
        </div>
        <div className="h-[420px] animate-pulse rounded-2xl bg-slate-900/80" />
      </div>
    </div>
  );
}

