import { Metadata } from "next";
import GiveawaysPage from "@/components/pages/Dashboards/GiveawaysPage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <GiveawaysPage />
    </div>
  );
}

export default page;
