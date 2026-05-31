"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function LoginRedirectCapture() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/login" && pathname !== "/onboarding") {
      sessionStorage.setItem("login_redirect", pathname);
    }
  }, [pathname]);

  return null;
}
