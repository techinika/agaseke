import { Metadata } from "next";
import PartnersPage from "@/components/pages/Dashboards/PartnersPage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <PartnersPage />
    </div>
  );
}

export default page;
