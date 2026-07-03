import { Metadata } from "next";
import PayoutsPage from "@/components/pages/Dashboards/PayoutsPage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <PayoutsPage />
    </div>
  );
}

export default page;
