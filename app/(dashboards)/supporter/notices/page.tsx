import { Metadata } from "next";
import React from "react";
import NoticesPage from "@/components/pages/Dashboards/NoticesPage";
import FeedbackFAB from "@/components/parts/FeedbackFAB";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <>
      <NoticesPage />
      <FeedbackFAB className="bottom-24 right-4 lg:bottom-6 lg:right-6" />
    </>
  );
}

export default page;
