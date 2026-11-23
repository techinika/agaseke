"use client";

import Link from "next/link";
import { ArrowLeft, Home, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NotFoundContent() {
  const router = useRouter();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-12 text-fg">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-card bg-brand-soft text-brand-strong">
          <Search className="size-6" aria-hidden="true" />
        </div>
        <p className="mt-5 text-label font-semibold text-brand-strong">
          Error 404
        </p>
        <h1 className="mt-2 font-display text-heading font-bold tracking-tight text-fg">
          Page not found
        </h1>
        <p className="mt-3 text-body leading-relaxed text-muted-fg">
          This page does not exist or the link may have moved.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className={buttonClasses({ variant: "primary", size: "md" })}
          >
            <Home className="size-4" aria-hidden="true" />
            Go home
          </Link>
          <Button
            variant="secondary"
            size="md"
            onClick={() => router.back()}
            leadingIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
          >
            Go back
          </Button>
        </div>
      </Card>
    </div>
  );
}
