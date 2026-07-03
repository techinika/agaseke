import { Metadata } from "next";
import React from "react";
import NoticesPage from "@/components/pages/Dashboards/NoticesPage";
import AuthGuard from "@/auth/AuthGuard";
import FeedbackFAB from "@/components/parts/FeedbackFAB";
import Navbar from "@/components/parts/Navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <AuthGuard>
      <Navbar />
      <NoticesPage />
      <FeedbackFAB />
    </AuthGuard>
  );
}

export default page;
