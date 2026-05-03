"use client";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
              <span className="text-white text-lg font-bold">a</span>
            </div>
            <span className="text-xl font-bold text-slate-900">agaseke.me</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-200 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-orange-200 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
          <div className="w-2 h-2 bg-orange-200 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>

      <div className="absolute bottom-8">
        <p className="text-xs font-medium text-slate-400">
          Audience Monetization Platform
        </p>
      </div>
    </div>
  );
}