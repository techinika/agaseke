import { Loader } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-10">
        {/* Logo with pulse animation */}
        <div className="relative">
          <div className="w-14 h-14 bg-foreground rounded-xl flex items-center justify-center shadow-xl">
            <span className="text-background text-2xl font-bold">a</span>
          </div>
          <div className="absolute inset-0 rounded-xl bg-orange-500 animate-ping opacity-20" />
        </div>

        {/* Brand text */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-2xl font-bold text-foreground tracking-tight">
            agaseke.me
          </span>

          {/* Loading indicator */}
          <div className="flex items-center gap-3">
            <Loader className="w-5 h-5 text-orange-600 animate-spin" />
            <span className="text-base font-medium text-muted-foreground">
              Loading...
            </span>
          </div>
        </div>

        {/* Animated dots */}
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>

      {/* Footer text */}
      <div className="absolute bottom-10">
        <p className="text-xl font-medium text-muted-foreground">
          Audience Monetization Platform
        </p>
      </div>
    </div>
  );
}
