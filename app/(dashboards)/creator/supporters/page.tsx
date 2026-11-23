import { Metadata } from "next";
import React, { Suspense } from "react";
import SupportersPage from "@/components/pages/Dashboards/SupportersPage";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SupportersRoutePage() {
  return (
    <Suspense fallback={<LoadingState variant="page" />}>
      <SupportersPage />
    </Suspense>
  );
}
