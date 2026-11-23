import { Metadata } from "next";
import React, { Suspense } from "react";
import CreatorSettings from "@/components/pages/Dashboards/SettingsPage";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SettingsRoutePage() {
  return (
    <Suspense fallback={<LoadingState variant="page" />}>
      <CreatorSettings />
    </Suspense>
  );
}
