"use client";

import { useAuth } from "@/auth/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Loading from "@/app/loading";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isCreator, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    if (pathname.startsWith("/creator") && !isCreator) {
      router.push("/supporter");
      return;
    }
    
    if (pathname === "/onboarding" && isCreator) {
      router.push("/creator");
    }

  }, [isLoggedIn, isCreator, loading, router, pathname]);

  if (loading) return <Loading />;

  const isAuthPage = !isLoggedIn;
  const isCreatorPage = pathname.startsWith("/creator");
  
  if (isAuthPage) return null;
  if (isCreatorPage && !isCreator) return null;

  return <>{children}</>;
}