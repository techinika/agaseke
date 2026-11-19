import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ProfileLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading creator page"
      className="mx-auto max-w-2xl px-4 pb-16 pt-4"
    >
      <Skeleton className="aspect-[16/7] w-full" rounded="card" />
      <div className="-mt-10 px-2">
        <Skeleton className="size-20 border-4 border-canvas" rounded="full" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-12 flex-1" />
        <Skeleton className="h-12 flex-1" />
      </div>
      <div className="mt-6 flex gap-2 border-b border-line pb-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="mt-5 space-y-3" aria-hidden="true">
        <Card className="p-4">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </Card>
        <Card className="p-4">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="mt-3 h-24 w-full" />
        </Card>
      </div>
    </div>
  );
}
