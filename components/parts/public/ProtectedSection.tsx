"use client";

import { Heart, Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const ProtectedSection = ({
  isLoggedIn,
  hasGifted,
  type,
  setIsModalOpen,
  handle,
}: {
  isLoggedIn: boolean;
  hasGifted: boolean;
  type: "login" | "gift";
  setIsModalOpen: any;
  handle?: string;
}) => {
  const pathname = usePathname();
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
        <Lock className="text-muted-fg mb-4" size={48} />
        <h3 className="text-xl font-bold">Authentication Required</h3>
        <p className="text-muted-fg max-w-xs mx-auto mb-6">
          Please log in to access this feature and connect with the creator.
        </p>
        <Link
          href={`/login?referral=${handle}&redirect=${encodeURIComponent(pathname)}`}
          className="bg-surface-raised text-on-brand px-8 py-3 rounded-control font-bold hover:bg-brand-strong transition-all"
        >
          Log In to Agaseke
        </Link>
      </div>
    );
  }

  if (type === "gift" && !hasGifted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
        <Heart className="text-brand-strong mb-4" size={48} />
        <h3 className="text-xl font-bold">Support to Unlock</h3>
        <p className="text-muted-fg max-w-xs mx-auto mb-6">
          This feature is exclusive to supporters. Send a small support to enable
          it.
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-strong text-on-brand px-8 py-3 rounded-control font-bold hover:bg-brand-strong transition-all"
        >
          Support
        </button>
      </div>
    );
  }

  return null;
};
