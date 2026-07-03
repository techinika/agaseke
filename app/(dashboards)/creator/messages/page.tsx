import { Metadata } from "next";
import MessagesPage from "@/components/pages/Dashboards/MessagesPage";
import React from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function page() {
  return (
    <div>
      <MessagesPage />
    </div>
  );
}

export default page;
