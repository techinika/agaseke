"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

interface TabErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function TabErrorState({
  message = "We couldn't load this section. Please try again.",
  onRetry,
}: TabErrorStateProps) {
  return (
    <div className="animate-in fade-in duration-500 py-12 text-center">
      <AlertTriangle className="mx-auto mb-4 size-12 text-warning" aria-hidden="true" />
      <p className="text-body font-bold text-fg">Couldn&apos;t load this section</p>
      <p className="mx-auto mt-2 max-w-sm text-label text-muted-fg">{message}</p>
      {onRetry && (
        <Button
          className="mt-5"
          onClick={onRetry}
          leadingIcon={<RefreshCw className="size-4" aria-hidden="true" />}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
