"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface ErrorContentProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const GENERAL_WORKER_URL =
  process.env.NEXT_PUBLIC_GENERAL_WORKER_URL || "http://localhost:8787";

export default function ErrorContent({ error, reset }: ErrorContentProps) {
  useEffect(() => {
    fetch(`${GENERAL_WORKER_URL}/api/general/log-error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: "error",
        category: "system",
        message: error.message || "Unknown client error",
        metadata: {
          digest: error.digest,
          stack: error.stack?.slice(0, 2000),
          url: window.location.href,
          userAgent: window.navigator.userAgent,
        },
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-12 text-fg">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-card bg-danger-bg text-danger">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <p className="mt-5 text-caption font-bold uppercase tracking-[0.16em] text-danger">
          Unexpected error
        </p>
        <h1 className="mt-2 text-heading font-black tracking-tight text-fg">
          Something went wrong
        </h1>
        <p className="mt-3 text-body leading-relaxed text-muted-fg">
          Please try again or return to the home page.
        </p>
        {error?.message && (
          <p className="mt-4 rounded-control border border-line bg-surface-raised p-3 text-caption text-muted-fg">
            {error.message}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="primary"
            size="md"
            onClick={() => reset()}
            leadingIcon={<RotateCcw className="size-4" aria-hidden="true" />}
          >
            Try again
          </Button>
          <Link
            href="/"
            className={buttonClasses({ variant: "secondary", size: "md" })}
          >
            <Home className="size-4" aria-hidden="true" />
            Go home
          </Link>
        </div>
      </Card>
    </div>
  );
}
