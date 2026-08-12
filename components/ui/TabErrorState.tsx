"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface TabErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function TabErrorState({
  message = "We couldn't load this section. Please try again.",
  onRetry,
}: TabErrorStateProps) {
  return (
    <div className="animate-in fade-in duration-500 text-center py-12">
      <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
      <p className="text-foreground font-medium">Couldn&apos;t load this section</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-lg font-bold text-sm hover:bg-orange-600 transition"
        >
          <RefreshCw size={16} /> Try Again
        </button>
      )}
    </div>
  );
}
