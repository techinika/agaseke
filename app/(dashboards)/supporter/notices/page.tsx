import React from "react";
import NoticesPage from "@/components/pages/Dashboards/NoticesPage";
import AuthGuard from "@/auth/AuthGuard";
import FeedbackFAB from "@/components/parts/FeedbackFAB";

function page() {
  return (
    <AuthGuard>
      <NoticesPage />
      <FeedbackFAB />
    </AuthGuard>
  );
}

export default page;
