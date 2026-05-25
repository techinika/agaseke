import { Metadata } from "next";
import SalesPage from "@/components/pages/Dashboards/SalesPage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <SalesPage />
    </div>
  );
}

export default page;