import { Metadata } from "next";
import GatheringsPage from "@/components/pages/Dashboards/GatheringsPage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <GatheringsPage />
    </div>
  );
}

export default page;
