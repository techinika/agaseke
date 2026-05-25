import { Metadata } from "next";
import React from "react";
import NoticesPage from "@/components/pages/Dashboards/NoticesPage";
import AuthGuard from "@/auth/AuthGuard";
import FeedbackFAB from "@/components/parts/FeedbackFAB";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <AuthGuard>
      <NoticesPage />
      <FeedbackFAB />
    </AuthGuard>
  );
}

export default page;
