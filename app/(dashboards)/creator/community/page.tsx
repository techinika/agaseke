import { Metadata } from "next";
import CommunityPage from "@/components/pages/Dashboards/CommunityPage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <CommunityPage />
    </div>
  );
}

export default page;
