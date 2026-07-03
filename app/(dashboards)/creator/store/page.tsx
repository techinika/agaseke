import { Metadata } from "next";
import StorePage from "@/components/pages/Dashboards/StorePage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <StorePage />
    </div>
  );
}

export default page;
