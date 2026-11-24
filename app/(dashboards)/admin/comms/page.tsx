import { Metadata } from "next";
import React, { Suspense } from "react";
import AdminCommsHub from "@/components/pages/Dashboards/Admin/AdminCommsHub";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminCommsRoutePage() {
  return (
    <Suspense fallback={<LoadingState variant="list" />}>
      <AdminCommsHub />
    </Suspense>
  );
}
