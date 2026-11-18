"use client";

import { lazy, Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Store } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/shell/PageHeader";
import { t } from "@/lib/i18n";
import { CreatorSupportBar } from "@/features/creator-page/components/CreatorSupportBar";
import type { CreatorSubpageData } from "@/features/creator-page/hooks/useCreatorSubpageData";

const LazySupportModal = lazy(() =>
  import("@/components/parts/public/SupportModal").then((module) => ({
    default: module.SupportModal,
  })),
);

export interface CreatorSubpageChildProps {
  openSupport: () => void;
}

export interface CreatorSubpageProps {
  username: string;
  title: string;
  description: string;
  data: CreatorSubpageData;
  children: ReactNode | ((props: CreatorSubpageChildProps) => ReactNode);
}

function CreatorSubpageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6" aria-busy="true" aria-label={t("common.loading")}>
      <Skeleton className="h-12 w-40" />
      <Skeleton className="mt-6 h-8 w-1/2" />
      <Skeleton className="mt-3 h-5 w-2/3" />
      <div className="mt-8 space-y-4">
        <Skeleton className="h-40 w-full" rounded="card" />
        <Skeleton className="h-40 w-full" rounded="card" />
      </div>
    </div>
  );
}

export function CreatorSubpage({
  username,
  title,
  description,
  data,
  children,
}: CreatorSubpageProps) {
  const [supportOpen, setSupportOpen] = useState(false);

  if (data.loading) return <CreatorSubpageSkeleton />;

  if (data.error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <ErrorState
          title={t("creator.loadErrorTitle")}
          description={t("creator.loadErrorBody")}
          onRetry={data.retry}
        />
      </div>
    );
  }

  if (!data.creator) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <EmptyState
          icon={<Store className="size-6" aria-hidden="true" />}
          title={t("creatorSubpage.notFoundTitle")}
          description={t("creatorSubpage.notFoundBody")}
          action={
            <Link href="/explore" className={buttonClasses({ variant: "primary" })}>
              {t("nav.exploreCreators")}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-canvas pb-28 text-fg md:pb-10">
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <Link
          href={`/${username}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-control text-label font-semibold text-muted-fg transition hover:text-fg focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          {t("creatorSubpage.backToProfile")}
        </Link>

        <div className="mt-4">
          <PageHeader
            title={title}
            description={description}
            actions={
              <Button
                variant="secondary"
                leadingIcon={<Heart className="size-4" aria-hidden="true" />}
                onClick={() => setSupportOpen(true)}
              >
                {t("creator.supportName", { name: data.creatorName.split(" ")[0] })}
              </Button>
            }
          />
        </div>

        <div className="mt-6 min-h-[420px]">
          {typeof children === "function"
            ? children({ openSupport: () => setSupportOpen(true) })
            : children}
        </div>
      </div>

      <CreatorSupportBar
        firstName={data.creatorName.split(" ")[0]}
        onSupport={() => setSupportOpen(true)}
      />

      {supportOpen && (
        <Suspense fallback={null}>
          <LazySupportModal
            isOpen={supportOpen}
            onClose={() => setSupportOpen(false)}
            creatorName={data.creatorName}
            creatorId={username}
            uid={data.creator.uid}
            includeReferral={data.profile?.referralCreator != null}
            referralUid={data.referralId}
            referralId={data.profile?.referralCreator as string | undefined}
          />
        </Suspense>
      )}
    </div>
  );
}
