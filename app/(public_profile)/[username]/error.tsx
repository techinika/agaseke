"use client";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t load this page. Please try again.
        </p>
        <button
          onClick={reset}
          className="bg-foreground text-background px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
