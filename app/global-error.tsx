"use client";

import React from "react";
import Link from "next/link";
import { Home, AlertTriangle } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html>
      <body className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle size={40} className="text-red-500" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Critical Error
          </h2>
          <p className="text-slate-500 mb-6">
            Something went wrong. Please try refreshing the page.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => reset()}
              className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-lg hover:border-slate-900 transition"
            >
              <Home size={18} /> Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
