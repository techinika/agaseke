import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { t } from "@/lib/i18n";

export function VerificationSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8"
      role="status"
      aria-label={t("common.loading")}
    >
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-5 w-80 max-w-full" />
      <div className="mt-6 flex flex-col gap-5">
        <Card className="p-5">
          <Skeleton className="h-16 w-full" />
        </Card>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="flex flex-col gap-4 p-5">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </Card>
          <Card className="flex flex-col gap-4 p-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
