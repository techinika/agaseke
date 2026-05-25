export default function DetailSkeleton() {
  const skeletonLine = (w: string) => <div className={`h-3 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse ${w}`} />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-14 h-4 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
            <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          </div>
          <div className="w-full h-64 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          <div className="space-y-3">
            {skeletonLine("w-3/4")}
            {skeletonLine("w-full")}
            {skeletonLine("w-5/6")}
            {skeletonLine("w-1/2")}
          </div>
          <div className="pt-4 border-t border-border flex items-center gap-4">
            {skeletonLine("w-16")}
            {skeletonLine("w-12")}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="w-32 h-5 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 bg-card p-4 rounded-xl border border-border">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                {skeletonLine("w-20")}
                {skeletonLine("w-3/4")}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <div className="flex-1 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          <div className="w-16 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
