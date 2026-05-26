import { Metadata } from "next";
import SupportersPage from "@/components/pages/Dashboards/SupportersPage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <SupportersPage />
    </div>
  );
}

export default page;
