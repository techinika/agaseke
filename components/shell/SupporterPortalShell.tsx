"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/auth/AuthContext";
import { PublicFooter } from "@/components/shell/PublicFooter";
import { PublicHeader } from "@/components/shell/PublicHeader";
import { SupporterShell } from "@/components/shell/SupporterShell";
import { LoadingState } from "@/components/ui/LoadingState";

export function SupporterPortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();
  const isDiscoveryRoute =
    pathname === "/explore" || pathname.startsWith("/explore/");
  const signedIn = Boolean(auth.isLoggedIn && auth.user);

  if (signedIn) {
    return <SupporterShell>{children}</SupporterShell>;
  }

  if (!isDiscoveryRoute && auth.loading) {
    return (
      <div className="min-h-dvh bg-canvas px-4 py-12 text-fg">
        <div className="mx-auto max-w-4xl">
          <LoadingState variant="page" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
