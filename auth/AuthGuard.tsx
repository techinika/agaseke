"use client";

import { useAuth } from "@/auth/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isCreator, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (pathname.startsWith("/creator") && !isCreator) {
      router.push("/supporter");
      return;
    }

    if (pathname === "/onboarding" && isCreator) {
      router.push("/creator");
    }

    if (pathname.startsWith("/admin") && !isAdmin) {
      router.push("/supporter");
    }
  }, [isLoggedIn, isCreator, isAdmin, loading, router, pathname]);

  if (loading) {
    return (
      <LoadingState
        variant={pathname.startsWith("/supporter") ? "feed" : "dashboard"}
        className="mx-auto max-w-app px-4 py-8 sm:px-6 lg:px-8"
      />
    );
  }

  const isAuthPage = !isLoggedIn;
  const isCreatorPage = pathname.startsWith("/creator");

  if (isAuthPage) return null;
  if (isCreatorPage && !isCreator) return null;

  return <>{children}</>;
}
