import { Metadata } from "next";
import CreatorSettings from "@/components/pages/Dashboards/SettingsPage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <CreatorSettings />
    </div>
  );
}

export default page;
