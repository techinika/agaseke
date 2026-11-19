import { Loader2 } from "lucide-react";
import { Card } from "./Card";
import { Skeleton } from "./Skeleton";
import { cn } from "@/lib/cn";

export type LoadingVariant = "page" | "dashboard" | "feed" | "list" | "form";

export interface LoadingStateProps {
  variant?: LoadingVariant;
  label?: string;
  className?: string;
}

function PageSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 shrink-0" rounded="full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="space-y-3 p-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-28 max-w-full" />
            <Skeleton className="h-3 w-16" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-4 p-5 lg:col-span-2">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-1 items-center gap-3">
                  <Skeleton className="size-9 shrink-0" rounded="full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-3 p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </Card>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-10 w-24" />
      </div>
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={index} className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0" rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <Skeleton className="h-36 w-full" rounded="card" />
        </Card>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-4xl space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="flex items-center justify-between gap-4 p-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-8 w-20 shrink-0" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-60 max-w-full" />
      </div>
      <Card className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 shrink-0" rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
        <div className="flex justify-end">
          <Skeleton className="h-11 w-32" />
        </div>
      </Card>
    </div>
  );
}

export function LoadingState({
  variant = "page",
  label = "Loading",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("min-h-[50dvh] w-full bg-canvas text-fg", className)}
    >
      <div
        aria-hidden="true"
        className="h-0.5 w-full overflow-hidden bg-surface-sunken"
      >
        <div className="h-full w-2/5 rounded-pill bg-brand-strong motion-safe:animate-pulse" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex items-center gap-2 text-label font-semibold text-muted-fg">
          <Loader2
            className="size-4 shrink-0 text-brand-strong motion-safe:animate-spin"
            aria-hidden="true"
          />
          <span>{label}…</span>
        </div>

        {variant === "page" && <PageSkeleton />}
        {variant === "dashboard" && <DashboardSkeleton />}
        {variant === "feed" && <FeedSkeleton />}
        {variant === "list" && <ListSkeleton />}
        {variant === "form" && <FormSkeleton />}
      </div>
    </div>
  );
}
