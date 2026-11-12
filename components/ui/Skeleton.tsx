import { cn } from "@/lib/cn";

export interface SkeletonProps {
  className?: string;
  rounded?: "control" | "card" | "full";
}

export function Skeleton({ className, rounded = "control" }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-pulse bg-line",
        rounded === "control" && "rounded-control",
        rounded === "card" && "rounded-card",
        rounded === "full" && "rounded-full",
        className,
      )}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <span className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </span>
  );
}
