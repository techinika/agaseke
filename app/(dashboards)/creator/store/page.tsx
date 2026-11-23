import { Metadata } from "next";
import React, { Suspense } from "react";
import StorePage from "@/components/pages/Dashboards/StorePage";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function StoreRoutePage() {
  return (
    <Suspense fallback={<LoadingState variant="page" />}>
      <StorePage />
    </Suspense>
  );
}
