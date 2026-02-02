import CreatorDashboard from "@/components/pages/Dashboards/CreatorSpace";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator Space | Agaseke for Creators",
  description: "Creator Space on Agaseke.",
  robots: {
    index: false,
    follow: false,
  },
};

function page() {
  return (
    <div>
      <CreatorDashboard />
    </div>
  );
}

export default page;
