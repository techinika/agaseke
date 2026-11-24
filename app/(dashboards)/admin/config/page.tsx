import { Metadata } from "next";
import React, { Suspense } from "react";
import AdminConfigHub from "@/components/pages/Dashboards/Admin/AdminConfigHub";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminConfigRoutePage() {
  return (
    <Suspense fallback={<LoadingState variant="list" />}>
      <AdminConfigHub />
    </Suspense>
  );
}
