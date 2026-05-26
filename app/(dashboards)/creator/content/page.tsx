import { Metadata } from "next";
import ContentManager from "@/components/pages/Dashboards/ContentPage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <ContentManager />
    </div>
  );
}

export default page;
